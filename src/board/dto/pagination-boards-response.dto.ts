import { BoardResponseDto } from './board-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationBoardsResponseDto {
  @ApiProperty({ description: '게시글 목록', type: [BoardResponseDto] })
  data: BoardResponseDto[];

  @ApiProperty({ description: '현재 게시글 개수' })
  currentCount: number;

  @ApiProperty({ description: '현재 페이지' })
  page: number;

  @ApiProperty({ description: '한 페이지당 게시글 수' })
  limit: number;

  @ApiProperty({ description: '전체 페이지 수' })
  totalPage: number;
}
