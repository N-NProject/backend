import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { Message } from '../message/entities/message.entity';
import { Board } from '../board/entities/board.entity';
import { EventsGateway } from '../events/events.gateway';
import { JwtService } from '@nestjs/jwt';
import { SseResponseDto } from '../sse/dto/sse-response.dto';
import { Observable } from 'rxjs';
import { BoardService } from '../board/board.service';
import { UserChatRoom } from 'src/user-chat-room/entities/user-chat-room.entity';
import { SseService } from '../sse/sse.service';

@Injectable()
export class ChatRoomService {
  private readonly logger = new Logger(ChatRoomService.name);
  //private currentCapacity: { [key: number]: number } = {}; //각 채팅방의 현재 인원
  private participants: { [key: number]: Set<number> } = {}; //각 채팅방에 참여 중인 사용자 id 저장

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
    private readonly sseService: SseService,
  ) {}

  /** 게시글에 해당하는 채팅방 생성 */
  async createChatRoomForBoard(
    queryRunner: QueryRunner,
    board: Board,
    user: User,
  ): Promise<ChatRoom> {
    const chatRoom: ChatRoom = queryRunner.manager.create(ChatRoom, {
      board: board,
      chat_name: `보드 ${board.id} 채팅방`,
      member_count: 1,
      max_member_count: board.max_capacity,
    });
    const savedChatRoom = await queryRunner.manager.save(chatRoom);

    // participants 초기화
    this.participants[savedChatRoom.id] = new Set<number>();
    this.participants[savedChatRoom.id].add(user.id); // 게시글 작성자를 추가

    // 게시글 작성자를 채팅방에 추가
    const userChatRoom: UserChatRoom = queryRunner.manager.create(
      UserChatRoom,
      {
        user: user,
        chatRoom: savedChatRoom,
      },
    );
    await queryRunner.manager.save(userChatRoom);

    return savedChatRoom;
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

  // 채팅방에 참가
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

    if (!this.participants[chatRoom.id]) {
      this.participants[chatRoom.id] = new Set<number>();
    }

    // 이미 참가한 유저 확인
    if (this.participants[chatRoom.id].has(userId)) {
      throw new Error('user가 이미 방에 들어가있습니다.');
    }

    // 사용자 추가
    this.participants[chatRoom.id].add(userId);

    const newUserChatRoom = this.userChatRoomRepository.create({
      chatRoom: chatRoom,
      user: { id: userId },
    });

    await this.userChatRoomRepository.save(newUserChatRoom);

    // 현재 인원 수는 participants[chatRoom.id].size로 추적
    chatRoom.member_count = this.participants[chatRoom.id].size;
    await this.chatRoomRepository.save(chatRoom);

    const user = await this.getUser(userId);
    this.sseService.notifyMemberCountChange(
      chatRoom.id,
      chatRoom.member_count,
      user.username,
    );

    this.logger.log(
      `User ${userId} joined chat room ID: ${chatRoom.id}. Current count: ${this.participants[chatRoom.id].size}`,
    );

    return chatRoom.id;
  }

  // 채팅방에서 나가기
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

    await this.userChatRoomRepository.delete({
      user: { id: userId },
      chatRoom: { id: chatRoom.id },
    });

    if (!this.participants[chatRoom.id]) {
      this.participants[chatRoom.id] = new Set<number>();
    }

    // 사용자 제거
    this.participants[chatRoom.id].delete(userId);

    // 현재 인원 수는 participants[chatRoom.id].size로 추적
    chatRoom.member_count = this.participants[chatRoom.id].size;
    await this.chatRoomRepository.save(chatRoom);

    const user = await this.getUser(userId);
    this.sseService.notifyMemberCountChange(
      chatRoom.id,
      chatRoom.member_count,
      user.username,
    );

    this.logger.log(
      `User ${userId} left chat room ID: ${chatRoom.id}. Current count: ${this.participants[chatRoom.id].size}`,
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

    const message = this.messageRepository.create({
      content: content,
      nickname: username,
      chatRoom: chatRoom,
      user: user,
    });

    await this.messageRepository.save(message);

    // 실시간 메시지 전송
    this.eventsGateway.broadcastMessage('broadcastMessage', {
      chatRoomId: chatRoomId,
      content: message.content,
      nickName: username,
    });

    this.logger.log(
      `채팅방 ${chatRoomId}에 메시지 전송: ${message.content} by ${username}`,
    );

    return message;
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

    // SSEService의 getRoomUpdatesObservable 사용
    return this.sseService.getRoomUpdatesObservable(chatRoom.id);
  }

  public async findChatRoomByBoardId(boardId: number): Promise<ChatRoom> {
    return this.chatRoomRepository.findOne({
      where: { board: { id: boardId } },
      relations: ['userChatRooms', 'userChatRooms.user'],
    });
  }
}
