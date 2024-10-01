import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Cursor } from '../../global/common/dto/cursor.dto';
import { BoardResponseDto } from '../../board/dto/board-response.dto';

export class PaginatedBoardsDto {
  @ApiProperty({ type: [BoardResponseDto] })
  data: BoardResponseDto[];

  @ApiProperty()
  @Type(() => Cursor)
  cursor: Cursor;
}

export class UserResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({ type: PaginatedBoardsDto })
  createdBoards: PaginatedBoardsDto;

  @ApiProperty({ type: PaginatedBoardsDto })
  joinedBoards: PaginatedBoardsDto;
}
