import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from '../board/entities/board.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { UserChatRoom } from '../user-chat-room/entities/user-chat-room.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
    @InjectRepository(UserChatRoom)
    private userChatRoomRepository: Repository<UserChatRoom>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOrCreateChatRoom(boardId: number): Promise<ChatRoom> {
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
      relations: ['chat_room', 'user'],
    });
    if (!board) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    let chatRoom = board.chat_room;

    if (!chatRoom) {
      chatRoom = this.chatRoomRepository.create({
        chat_name: `${boardId}번 게시물의 채팅방`,
        member_count: 1, // 게시글 작성자는 자동으로 참여
        max_member_count: board.max_capacity, // 게시글의 최대 인원을 채팅방 최대 인원으로 설정
      });
      chatRoom = await this.chatRoomRepository.save(chatRoom);

      board.chat_room = chatRoom;
      await this.boardRepository.save(board);

      // 게시글 작성자를 채팅방에 추가
      await this.addUserToChatRoom(chatRoom.id, board.user.id);
    }

    return chatRoom;
  }

  async joinChatRoom(chatRoomId: number, userId: number): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) {
      throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    }

    const existingEntry = await this.userChatRoomRepository.findOne({
      where: { chatRoom: { id: chatRoomId }, user: { id: userId } },
    });
    if (existingEntry) {
      throw new ConflictException('이미 채팅방에 참여한 유저입니다');
    }

    if (chatRoom.member_count >= chatRoom.max_member_count) {
      throw new ConflictException('채팅방이 가득 찼습니다');
    }

    chatRoom.member_count += 1;
    await this.addUserToChatRoom(chatRoom.id, userId);
    return this.chatRoomRepository.save(chatRoom);
  }

  private async addUserToChatRoom(chatRoomId: number, userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    const userChatRoom = this.userChatRoomRepository.create({
      user,
      chatRoom,
    });
    await this.userChatRoomRepository.save(userChatRoom);
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
      throw new NotFoundException(
        '해당 유저는 이 채팅방에 참여하지 않았습니다.',
      );
    }

    await this.userChatRoomRepository.remove(userChatRoom);

    chatRoom.member_count -= 1;
    await this.chatRoomRepository.save(chatRoom);
  }
}
