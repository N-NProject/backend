import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from '../board/entities/board.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
  ) {}

  /**
   * 채팅방 생성
   * TODO: 게시글을 생성한 유저라면 해당 유저는 채팅방이 자동으로 생성되도록 수정
   */
  async findOrCreateChatRoom(
    boardId: number,
    createChatRoomDto: CreateChatRoomDto,
  ): Promise<ChatRoom> {
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
      relations: ['chat_room'],
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    let chatRoom = board.chat_room;

    if (!chatRoom) {
      chatRoom = this.chatRoomRepository.create({
        chat_name: `${boardId}번 게시물의 채팅방`,
        member_count: 0,
        max_member_count: createChatRoomDto.maxMember,
      });
      chatRoom = await this.chatRoomRepository.save(chatRoom);

      board.chat_room = chatRoom;
      await this.boardRepository.save(board);
    }

    return chatRoom;
  }

  /**
   * 채팅방 참여
   * TODO: 채팅방에 이미 참여한 유저면 에러를 발생시키도록 수정
   * TODO: 채팅방 웹소켓으로 채팅할 수 있도록 추가
   */
  async joinChatRoom(chatRoomId: number, userId: number): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatRoomId },
    });
    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    if (chatRoom.member_count >= chatRoom.max_member_count) {
      throw new ConflictException('채팅방이 가득 찼습니다');
    }

    chatRoom.member_count += 1;
    return this.chatRoomRepository.save(chatRoom);
  }
}
