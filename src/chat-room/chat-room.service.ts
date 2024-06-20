import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { UserChatRoom } from '../user-chat-room/entities/user-chat-room.entity';
import { User } from '../user/entities/user.entity';
import { EventsGateway } from '../evnets/events.gateway';
import { Message } from '../message/entities/message.entity';
import { Board } from '../board/entities/board.entity';

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
        chat_name: `보드 ${boardId} 채팅방`, // 여기서 chat_name을 사용해야 합니다.
        member_count: 0, // 초기 멤버 수를 설정합니다.
        max_member_count: 50, // 최대 멤버 수를 설정합니다.
      });
      await this.chatRoomRepository.save(chatRoom);
    }
    return chatRoom;
  }

  async getMessages(chatRoomId: number): Promise<Message[]> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
      relations: ['messages'],
    });
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다');
    }
    return chatRoom.messages;
  }

  async sendMessage(
    chatRoomId: number,
    userId: number,
    content: string,
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
    if (this.eventsGateway.server && this.eventsGateway.server.clients) {
      this.eventsGateway.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              event: 'broadcastMessage',
              data: message.content,
              chatRoomId: chatRoomId,
            }),
          );
        }
      });
    }
    this.eventsGateway.log(
      `채팅방 ${chatRoomId}에 메시지 전송: ${message.content}`,
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

    const userChatRoom = this.userChatRoomRepository.create({ user, chatRoom });
    await this.userChatRoomRepository.save(userChatRoom);

    chatRoom.member_count += 1;
    await this.chatRoomRepository.save(chatRoom);

    // 클라이언트에게 방 입장 알림
    if (this.eventsGateway.server && this.eventsGateway.server.clients) {
      this.eventsGateway.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              event: 'broadcastMessage',
              data: `${user.username} 님이 방에 입장했습니다.`,
              chatRoomId: chatRoomId,
            }),
          );
        }
      });
    }
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
    if (this.eventsGateway.server && this.eventsGateway.server.clients) {
      this.eventsGateway.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              event: 'broadcastMessage',
              data: `사용자 ${userId} 님이 방에서 나갔습니다.`,
              chatRoomId: chatRoomId,
            }),
          );
        }
      });
    }
    this.eventsGateway.log(
      `사용자 ${userId} 님이 방 ${chatRoomId}에서 나갔습니다.`,
    );
  }
}
