import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { UserChatRoom } from '../user-chat-room/entities/user-chat-room.entity';
import { User } from '../user/entities/user.entity';
import { Message } from '../message/entities/message.entity';
import { Board } from '../board/entities/board.entity';
import { EventsGateway } from '../evnets/events.gateway';
import { Socket } from 'socket.io';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(UserChatRoom)
    private userChatRoomRepository: Repository<UserChatRoom>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
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

  async getUser(userId: number): Promise<User> {
    return this.userRepository.findOne({ where: { id: userId } });
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

    this.eventsGateway.log(
      `채팅방 ${chatRoomId}에 메시지 전송: ${message.content} by ${username}`,
    );

    return message;
  }

  async getChatRooms(): Promise<ChatRoom[]> {
    return this.chatRoomRepository.find();
  }

  async getChatRoom(chatRoomId: number): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['messages'],
    });
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }
    return chatRoom;
  }

  async createChatRoom(client: Socket, roomName: string): Promise<void> {
    const chatRoom = this.chatRoomRepository.create({
      chat_name: roomName,
    });
    await this.chatRoomRepository.save(chatRoom);
    client.data.chatRoomId = `room:${chatRoom.id}`;
    client.join(client.data.chatRoomId);
  }

  async deleteChatRoom(chatRoomId: number): Promise<void> {
    await this.chatRoomRepository.delete(chatRoomId);
  }

  async getChatRoomList(): Promise<ChatRoom[]> {
    return this.chatRoomRepository.find();
  }

  async enterChatRoom(client: Socket, chatRoomId: string): Promise<void> {
    client.leave(client.data.chatRoomId);
    client.data.chatRoomId = chatRoomId;
    client.join(chatRoomId);
  }

  async joinChatRoom(chatRoomId: number, userId: number): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    let baseNickname = user.username;
    let nickname = baseNickname;
    let suffix = 1;

    const userChatRooms = await this.userChatRoomRepository.find({
      where: { chatRoom: { id: chatRoomId } },
      relations: ['users'],
    });

    while (userChatRooms.some((ucr) => ucr.user.username === nickname)) {
      nickname = `${baseNickname}${suffix}`;
      suffix++;
    }

    user.username = nickname;

    const userChatRoom = this.userChatRoomRepository.create({ user, chatRoom });
    await this.userChatRoomRepository.save(userChatRoom);

    chatRoom.member_count += 1;
    await this.chatRoomRepository.save(chatRoom);

    // 클라이언트에게 방 입장 알림
    this.eventsGateway.broadcastMessage('broadcastMessage', {
      chatRoomId: `room:${chatRoomId}`,
      content: `${user.username} 님이 방에 입장했습니다.`,
    });

    this.eventsGateway.log(
      `사용자 ${user.username} 님이 방 ${chatRoomId}에 입장했습니다.`,
    );
  }

  async leaveChatRoom(chatRoomId: number, userId: number): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
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

    // 클라이언트에게 방 퇴장 알림
    this.eventsGateway.broadcastMessage('broadcastMessage', {
      chatRoomId: `room:${chatRoomId}`,
      content: `사용자 ${userId} 님이 방에서 나갔습니다.`,
    });

    this.eventsGateway.log(
      `사용자 ${userId} 님이 방 ${chatRoomId}에서 나갔습니다.`,
    );
  }
}
