import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { Board } from '../entities/board.entity';
import { PagingParams } from '../../global/common/type';

@Injectable()
export class CustomBoardRepository {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
  ) {}

  async paginateCreatedBoards(userId: number, pagingParams?: PagingParams) {
    const queryBuilder = this.boardRepository
      .createQueryBuilder('board')
      .where('board.user_id = :userId', { userId })
      .orderBy('board.updatedAt', 'DESC');

    const paginator = buildPaginator({
      entity: Board,
      paginationKeys: ['updatedAt'],
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
        afterCursor: paginationResult.cursor.afterCursor,
        beforeCursor: paginationResult.cursor.beforeCursor,
      },
    };
  }

  async paginateJoinedBoards(
    userId: number,
    chatroomIds: number[],
    pagingParams?: PagingParams,
  ) {
    const queryBuilder = this.boardRepository
      .createQueryBuilder('board')
      .where('board.chat_room IN (:...chatroomIds)', { chatroomIds })
      .andWhere('board.user_id != :userId', { userId })
      .orderBy('board.updatedAt', 'DESC');

    const paginator = buildPaginator({
      entity: Board,
      paginationKeys: ['updatedAt'],
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
        afterCursor: paginationResult.cursor.afterCursor,
        beforeCursor: paginationResult.cursor.beforeCursor,
      },
    };
  }
}
