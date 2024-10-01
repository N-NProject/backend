import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { UserChatRoom } from 'src/user-chat-room/entities/user-chat-room.entity';
import { PagingParams } from '../../global/common/type';

@Injectable()
export class CustomUserChatRoomRepository {
  constructor(
    @InjectRepository(UserChatRoom)
    private readonly userChatRoomRepository: Repository<UserChatRoom>,
  ) {}

  async getChatRoomIds(userChatRoomIds: number[]): Promise<number[]> {
    const chatRooms = await this.userChatRoomRepository
      .createQueryBuilder('ucr')
      .select('ucr.chat_room_id')
      .leftJoinAndSelect('ucr.chatRoom', 'chatRoom')
      .leftJoinAndSelect('chatRoom.board', 'board')
      .where('ucr.id IN (:...userChatRoomIds)', { userChatRoomIds })
      .getRawMany();

    return chatRooms.map((chatRoom) => chatRoom.chat_room_id);
  }

  async paginate(userId: number, pagingParams?: PagingParams) {
    const queryBuilder = this.userChatRoomRepository
      .createQueryBuilder('userchatroom')
      .leftJoinAndSelect('userchatroom.chatRoom', 'chatRoom')
      .leftJoinAndSelect('chatRoom.board', 'board')
      .leftJoinAndSelect('board.location', 'location')
      .where('userchatroom.user_id = :userId', { userId })
      .orderBy('userchatroom.id', 'DESC');

    const paginator = buildPaginator({
      entity: UserChatRoom,
      paginationKeys: ['id'],
      query: {
        limit: 10,
        order: 'DESC',
        afterCursor: pagingParams?.afterCursor,
        beforeCursor: pagingParams?.beforeCursor,
      },
    });

    const paginationResult = await paginator.paginate(queryBuilder);

    return {
      data: paginationResult.data,
      cursor: {
        count: paginationResult.data.length,
        ...paginationResult.cursor,
      },
    };
  }
}
