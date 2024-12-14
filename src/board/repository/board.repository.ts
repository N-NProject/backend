import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { Board } from '../entities/board.entity';
import { PagingParams } from '../../global/common/type';
import { DateUtil } from '../../global/util/date.util';

@Injectable()
export class CustomBoardRepository {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
  ) {}

  // 유저가 생성한 게시판을 페이징 처리하여 가져오는 메서드
  async paginateCreatedBoards(userId: number, pagingParams?: PagingParams) {
    const queryBuilder = this.boardRepository
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.location', 'location')
      .where('board.user.id = :userId', { userId }) // 명확히 user.id 참조
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

  // 유저가 참여한 게시판을 페이징 처리하여 가져오는 메서드
  async paginateJoinedBoards(
    userId: number,
    chatroomIds: number[],
    pagingParams?: PagingParams,
  ) {
    const queryBuilder = this.boardRepository
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.location', 'location')
      .where('board.chatRoom.id IN (:...chatroomIds)', { chatroomIds }) // 명확한 필드 참조
      .andWhere('board.user.id != :userId', { userId })
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

  async findBoardsOrderByStatusAndDeadline(
    page: number,
    limit: number,
  ): Promise<[Board[], number]> {
    const today: string = DateUtil.getKSTDate();
    const skip: number = (page - 1) * limit;

    return this.boardRepository
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.user', 'user')
      .leftJoinAndSelect('board.location', 'location')
      .leftJoinAndSelect('board.chatRoom', 'chatRoom')
      .addSelect(
        'CASE WHEN board.date >= :today AND chatRoom.memberCount < chatRoom.maxMemberCount THEN 0 ELSE 1 END',
        'recruitment_status',
      )
      .addSelect('(board.date::date - :today::date)', 'days_until_deadline')
      .orderBy('recruitment_status', 'ASC')
      .addOrderBy('days_until_deadline', 'ASC')
      .setParameter('today', today)
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }
}
