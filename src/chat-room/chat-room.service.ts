import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { UserChatRoom } from '../user-chat-room/entities/user-chat-room.entity';
import { User } from '../user/entities/user.entity';
import { Message } from '../message/entities/message.entity';
import { Board } from '../board/entities/board.entity';
import { EventsGateway } from '../evnets/events.gateway';
import { JwtService } from '@nestjs/jwt';
import { SseResponseDto } from '../sse/dto/sse-response.dto';
import { Observable, Subject } from 'rxjs';
import { BoardService } from '../board/board.service';

@Injectable()
export class ChatRoomService {
  private readonly logger = new Logger(ChatRoomService.name);
  private roomUpdates: { [key: number]: Subject<SseResponseDto> } = {};
  private currentCapacity: { [key: number]: number } = {};
  private participants: { [key: number]: Set<number> } = {};

  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(UserChatRoom)
    private readonly userChatRoomRepository: Repository<UserChatRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => BoardService))
    private readonly boardService: BoardService,
  ) {}

  async findOrCreateChatRoom(boardId: number): Promise<ChatRoom> {
    let chatRoom = await this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
    });
    if (!chatRoom) {
      const board = await this.boardRepository.findOne({
        where: { id: boardId },
      });
      if (!board) {
        throw new NotFoundException('Board not found');
      }

      chatRoom = this.chatRoomRepository.create({
        board: board,
        chat_name: `보드 ${boardId} 채팅방`,
        member_count: 0,
        max_member_count: board.max_capacity,
      });
      await this.chatRoomRepository.save(chatRoom);
    }
    return chatRoom;
  }

  async getChatRooms(): Promise<ChatRoom[]> {
    return this.chatRoomRepository.find();
  }

  async getChatRoom(chatRoomId: number): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['messages', 'board'],
    });
    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }
    return chatRoom;
  }

  async joinChatRoomByBoardId(boardId: number, token: string): Promise<void> {
    const chatRoom = await this.findChatRoomByBoardId(boardId);
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    return this.joinChatRoom(chatRoom.id, token);
  }

  async joinChatRoom(chatRoomId: number, token: string): Promise<void> {
    const payload = await this.verifyToken(token);
    const userId = payload.userId || payload.sub;
    console.log(`Extracted userId from token: ${userId}`);

    if (!userId) {
      throw new UnauthorizedException('Invalid token or userId missing');
    }

    // 추가된 디버깅 로그
    console.log(`Extracted userId from token: ${userId}`);

    if (!userId) {
      throw new UnauthorizedException('Invalid token or userId missing');
    }

    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['board'],
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    console.log(`Before increment: ${this.currentCapacity[chatRoomId]}`);
    this.currentCapacity[chatRoomId] =
      (this.currentCapacity[chatRoomId] || 0) + 1;
    console.log(`After increment: ${this.currentCapacity[chatRoomId]}`);

    this.participants[chatRoomId] =
      this.participants[chatRoomId] || new Set<number>();
    this.participants[chatRoomId].add(userId);

    // 이 부분에서 userId와 user 객체의 정보를 확인
    const user = await this.getUser(userId);
    console.log(`Fetched user: ${user.id} with username: ${user.username}`);
    console.log(`User joining: ID=${userId}, Username=${user.username}`);

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[chatRoomId];
    sseResponse.nickName = user.username;
    this.getOrCreateRoomUpdate(chatRoomId).next(sseResponse);

    chatRoom.member_count += 1;
    await this.chatRoomRepository.save(chatRoom);

    this.notifyMemberCountChange(chatRoom.id);
  }

  async leaveChatRoomByBoardId(boardId: number, userId: number): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    // 현재 참여자 리스트가 정의되지 않았을 경우 초기화
    if (!this.participants[chatRoom.id]) {
      this.participants[chatRoom.id] = new Set<number>();
    }

    console.log(`Before decrement: ${this.currentCapacity[chatRoom.id]}`);
    this.currentCapacity[chatRoom.id] = Math.max(
      (this.currentCapacity[chatRoom.id] || 1) - 1,
      0,
    );
    console.log(`After decrement: ${this.currentCapacity[chatRoom.id]}`);

    // userId를 participants에서 삭제
    this.participants[chatRoom.id].delete(userId);

    this.notifyMemberLeave(chatRoom.id, userId);
    this.notifyMemberCountChange(chatRoom.id);
  }

  async sendMessage(
    chatRoomId: number,
    userId: number,
    content: string,
    username: string,
  ): Promise<Message> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const message = this.messageRepository.create({ content, chatRoom, user });
    await this.messageRepository.save(message);

    // 실시간 메시지 전송
    this.eventsGateway.broadcastMessage('broadcastMessage', {
      chatRoomId: chatRoomId,
      message: message.content,
      nickname: username,
    });

    this.logger.log(
      `채팅방 ${chatRoomId}에 메시지 전송: ${message.content} by ${username}`,
    );

    return message;
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch (err) {
      throw new UnauthorizedException('Invalid token.');
    }
  }

  async getUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    console.log(`Fetched user: ${user.id} with username: ${user.username}`);
    return user;
  }

  async getRoomUpdatesByBoardId(
    boardId: number,
  ): Promise<Observable<SseResponseDto>> {
    const chatRoom = await this.findChatRoomByBoardId(boardId);
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    return this.getOrCreateRoomUpdate(chatRoom.id).asObservable();
  }

  private notifyMemberCountChange(chatRoomId: number): void {
    const roomUpdateSubject = this.getOrCreateRoomUpdate(chatRoomId);

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[chatRoomId]; // 현재 인원 수 포함
    sseResponse.nickName = ''; // 닉네임은 현재 필요한 경우에만 설정

    roomUpdateSubject.next(sseResponse);

    this.logger.log(
      `SSE event sent for chat room ${chatRoomId} with current person count ${sseResponse.currentPerson}`,
    );
  }

  private getOrCreateRoomUpdate(chatRoomId: number): Subject<SseResponseDto> {
    if (!this.roomUpdates[chatRoomId]) {
      this.roomUpdates[chatRoomId] = new Subject<SseResponseDto>();
    }
    return this.roomUpdates[chatRoomId];
  }

  private async notifyMemberLeave(
    chatRoomId: number,
    userId: number,
  ): Promise<void> {
    const user = await this.getUser(userId);
    const roomUpdateSubject = this.getOrCreateRoomUpdate(chatRoomId);

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[chatRoomId];
    sseResponse.nickName = user?.username || 'Unknown'; // 사용자의 닉네임 또는 'Unknown'으로 설정

    roomUpdateSubject.next(sseResponse);

    this.logger.log(
      `User ${userId} (${user?.username || 'Unknown'}) left chat room ${chatRoomId}. Current capacity: ${sseResponse.currentPerson}`,
    );
  }

  private async findChatRoomByBoardId(boardId: number): Promise<ChatRoom> {
    return this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
    });
  }
}
