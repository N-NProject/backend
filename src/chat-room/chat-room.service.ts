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
import { UserChatRoom } from 'src/user-chat-room/entities/user-chat-room.entity';

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
    @InjectRepository(UserChatRoom)
    private userChatRoomRepository: Repository<UserChatRoom>,
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

  async joinChatRoomByBoardId(
    boardId: number,
    userId: number,
  ): Promise<number> {
    if (!userId) {
      throw new UnauthorizedException('UserId를 찾을 수 없습니다');
    }

    const chatRoom = await this.findChatRoomByBoardId(boardId);

    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    const chatRoomId = chatRoom.id;

    //
    if (
      this.currentCapacity[chatRoomId] === undefined ||
      isNaN(this.currentCapacity[chatRoomId])
    ) {
      this.currentCapacity[chatRoomId] = chatRoom.member_count;
      this.logger.log(
        `Initial currentCapacity for chatRoom ${chatRoomId} set to ${this.currentCapacity[chatRoomId]}`,
      );
    }

    // 동일한 유저가 이미 같은 chatRoomId에 들어가 있는지 확인
    const userChatRoom = chatRoom.userChatRooms.find(
      (userChatRoom) => userChatRoom.user.id == userId,
    );

    if (userChatRoom) {
      throw new Error('user가 이미 방에 들어가있습니다.');
    }

    const newUserChatRoom = this.userChatRoomRepository.create({
      chatRoom: chatRoom,
      user: { id: userId },
    });

    this.userChatRoomRepository.save(newUserChatRoom);

    // 인원 증가
    this.currentCapacity[chatRoomId] += 1;
    this.logger.log(
      `currentCapacity for chatRoom ${chatRoomId} increased to ${this.currentCapacity[chatRoomId]}`,
    );

    this.participants[chatRoomId] =
      this.participants[chatRoomId] || new Set<number>();
    this.participants[chatRoomId].add(userId);

    const user = await this.getUser(userId);

    chatRoom.member_count = this.currentCapacity[chatRoomId];
    await this.chatRoomRepository.save(chatRoom);

    this.notifyMemberCountChange(chatRoomId, user.username);

    this.logger.log(
      `User ${userId} joined chat room ID: ${chatRoomId}. Current count: ${this.currentCapacity[chatRoomId]}`,
    );

    // BoardService에 알림
    await this.boardService.handleBoardUpdate(boardId);

    //
    return chatRoomId;
  }

  async leaveChatRoomByBoardId(
    boardId: number,
    userId: number,
  ): Promise<number> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
    });

    if (!chatRoom) {
      throw new NotFoundException('ChatRoom을 찾을 수 없습니다');
    }

    if (!this.participants[chatRoom.id]) {
      this.participants[chatRoom.id] = new Set<number>();
    }

    if (
      this.currentCapacity[chatRoom.id] === undefined ||
      isNaN(this.currentCapacity[chatRoom.id])
    ) {
      this.currentCapacity[chatRoom.id] = chatRoom.member_count;
      this.logger.log(
        `Initial currentCapacity for chatRoom ${chatRoom.id} set to ${this.currentCapacity[chatRoom.id]}`,
      );
    }

    //인원감소
    this.currentCapacity[chatRoom.id] = Math.max(
      this.currentCapacity[chatRoom.id] - 1,
      0,
    );
    this.logger.log(
      `currentCapacity for chatRoom ${chatRoom.id} decreased to ${this.currentCapacity[chatRoom.id]}`,
    );

    this.participants[chatRoom.id].delete(userId);

    const user = await this.getUser(userId);

    chatRoom.member_count = this.currentCapacity[chatRoom.id];
    await this.chatRoomRepository.save(chatRoom);

    this.userChatRoomRepository.delete({
      chatRoom: chatRoom,
      user: { id: userId },
    });

    this.notifyMemberCountChange(chatRoom.id, user.username);

    this.logger.log(
      `User ${userId} left chat room ID: ${chatRoom.id}. Current count: ${this.currentCapacity[chatRoom.id]}`,
    );

    return chatRoom.id;
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
    const chatRoom = await this.findChatRoomByBoardId(boardId);
    if (chatRoom) {
      return this.currentCapacity[chatRoom.id] || 0;
    }
    return 0;
  }

  public async findChatRoomByBoardId(boardId: number): Promise<ChatRoom> {
    return this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
      relations: ['userChatRooms', 'userChatRooms.user'],
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
