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
import { User } from '../user/entities/user.entity';
import { Message } from '../message/entities/message.entity';
import { Board } from '../board/entities/board.entity';
import { EventsGateway } from '../events/events.gateway';
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @Inject(forwardRef(() => BoardService))
    private readonly boardService: BoardService,
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
        member_count: 1,
        max_member_count: board.max_capacity,
      });
      await this.chatRoomRepository.save(chatRoom);
      this.currentCapacity[chatRoom.id] = 1;
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

    if (!userId) {
      throw new UnauthorizedException('UserId를 찾을 수 없습니다');
    }

    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['board'],
    });

    if (!chatRoom) {
      throw new NotFoundException('ChatRoom을 찾을 수 없습니다');
    }

    if (this.currentCapacity[chatRoomId] >= chatRoom.max_member_count) {
      throw new UnauthorizedException('채팅방의 최대 인원이 초과되었습니다');
    }

    //동일한 유저가 이미 같은 chatRoomId에 들어가 있는지 확인
    if (
      this.participants[chatRoomId] &&
      this.participants[chatRoomId].has(userId)
    ) {
      throw new Error('user가 이미 방에 들어가있습니다.');
    }

    this.currentCapacity[chatRoomId] =
      (this.currentCapacity[chatRoomId] || 0) + 1;

    this.participants[chatRoomId] =
      this.participants[chatRoomId] || new Set<number>();
    this.participants[chatRoomId].add(userId);

    const user = await this.getUser(userId);

    chatRoom.member_count += 1;
    await this.chatRoomRepository.save(chatRoom);

    this.notifyMemberCountChange(chatRoom.id, user.username);

    this.logger.log(
      `User ${userId} joined chat room ID: ${chatRoomId}. Current count: ${this.currentCapacity[chatRoomId]}`,
    );

    // BoardService에 알림
    await this.boardService.handleBoardUpdate(chatRoom.board.id);
  }

  async leaveChatRoomByBoardId(boardId: number, userId: number): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
    });

    if (!chatRoom) {
      throw new NotFoundException('ChatRoom을 찾을 수 없습니다');
    }

    if (!this.participants[chatRoom.id]) {
      this.participants[chatRoom.id] = new Set<number>();
    }

    console.log(`Before decrement: ${this.currentCapacity[chatRoom.id]}`);
    this.currentCapacity[chatRoom.id] = Math.max(
      (this.currentCapacity[chatRoom.id] || 1) - 1,
      0,
    );
    console.log(`After decrement: ${this.currentCapacity[chatRoom.id]}`);

    this.participants[chatRoom.id].delete(userId);

    const user = await this.getUser(userId);
    this.notifyMemberCountChange(chatRoom.id, user.username);

    // Log 추가
    this.logger.log(
      `User ${userId} left chat room ID: ${chatRoom.id}. Current count: ${this.currentCapacity[chatRoom.id]}`,
    );
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
      throw new UnauthorizedException('토큰을 찾을 수 없습니다');
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

  // 특정 boardId에 대한 currentPerson 값을 반환하는 메서드
  public async getCurrentCapacityForBoard(boardId: number): Promise<number> {
    const chatRoom = await this.findChatRoomByBoardId(boardId); // await 사용
    if (chatRoom) {
      return this.currentCapacity[chatRoom.id] || 0;
    }
    return 0;
  }

  public async findChatRoomByBoardId(boardId: number): Promise<ChatRoom> {
    return this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
    });
  }

  /* 채팅방 현재 인원 조회 */
  async getMemberCount(chatRoomId: number): Promise<number> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    return chatRoom ? chatRoom.member_count : 0;
  }

  private notifyMemberCountChange(chatRoomId: number, nickName?: string): void {
    const roomUpdateSubject = this.getOrCreateRoomUpdate(chatRoomId);

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[chatRoomId] || 1;
    sseResponse.chatRoomId = chatRoomId;

    if (nickName) {
      sseResponse.nickName = nickName;
    } else {
      sseResponse.nickName = '';
    }

    roomUpdateSubject.next(sseResponse);

    this.logger.log(
      `SSE event sent for chat room ${chatRoomId} with current person count ${sseResponse.currentPerson}, nickName: ${sseResponse.nickName}, and chatRoomId: ${sseResponse.chatRoomId}`,
    );
  }

  private getOrCreateRoomUpdate(chatRoomId: number): Subject<SseResponseDto> {
    if (!this.roomUpdates[chatRoomId]) {
      this.roomUpdates[chatRoomId] = new Subject<SseResponseDto>();
    }
    return this.roomUpdates[chatRoomId];
  }
}
