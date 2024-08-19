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
    const userId = payload.userId;

    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['board'],
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    // 이미 유저가 채팅방에 있는지 확인
    if (
      this.participants[chatRoomId] &&
      this.participants[chatRoomId].has(userId)
    ) {
      throw new UnauthorizedException('User already in chat room');
    }

    // 최대 인원 확인
    if (this.currentCapacity[chatRoomId] >= chatRoom.max_member_count) {
      throw new UnauthorizedException('Chat room is full');
    }

    const roomUpdateSubject = this.getOrCreateRoomUpdate(chatRoomId);

    this.currentCapacity[chatRoomId] =
      (this.currentCapacity[chatRoomId] || 0) + 1;
    this.participants[chatRoomId] =
      this.participants[chatRoomId] || new Set<number>();
    this.participants[chatRoomId].add(userId);

    const user = await this.getUser(userId);

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[chatRoomId];
    sseResponse.nickName = user.username;
    roomUpdateSubject.next(sseResponse);

    chatRoom.member_count += 1;
    await this.chatRoomRepository.save(chatRoom);

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

  async leaveChatRoom(chatRoomId: number, userId: number): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    const userChatRoom = await this.userChatRoomRepository.findOne({
      where: { chatRoom: { id: chatRoomId }, user: { id: userId } },
    });

    if (!userChatRoom) {
      throw new NotFoundException('User not in chat room.');
    }

    await this.userChatRoomRepository.remove(userChatRoom);
    chatRoom.member_count -= 1;
    await this.chatRoomRepository.save(chatRoom);

    // Decrement currentCapacity and notify others
    this.currentCapacity[chatRoomId] = Math.max(
      (this.currentCapacity[chatRoomId] || 1) - 1,
      0,
    );
    this.participants[chatRoomId].delete(userId);

    this.notifyMemberLeave(chatRoomId, userId);
    this.notifyMemberCountChange(chatRoomId);
  }

  notifyMemberCountChange(chatRoomId: number): void {
    const roomUpdateSubject = this.getOrCreateRoomUpdate(chatRoomId);

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[chatRoomId];

    roomUpdateSubject.next(sseResponse);

    this.logger.log(
      `SSE event sent for chat room ${chatRoomId} with current person count ${sseResponse.currentPerson}`,
    );
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verifyAsync(token);
    } catch (err) {
      throw new UnauthorizedException('Invalid token.');
    }
  }

  async getUser(userId: number): Promise<User> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  getRoomUpdates(chatRoomId: number): Observable<SseResponseDto> {
    const roomUpdateSubject = this.getOrCreateRoomUpdate(chatRoomId);
    return roomUpdateSubject.asObservable();
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
    sseResponse.nickName = user.username;

    roomUpdateSubject.next(sseResponse);

    this.logger.log(
      `User ${userId} (${user.username}) left chat room ${chatRoomId}. Current capacity: ${sseResponse.currentPerson}`,
    );
  }

  private async findChatRoomByBoardId(boardId: number): Promise<ChatRoom> {
    return this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
    });
  }
}
