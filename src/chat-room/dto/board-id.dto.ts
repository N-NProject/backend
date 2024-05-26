import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class BoardIdDto {
  @ApiProperty({ description: '게시글 id' })
  @IsInt()
  boardId: number;
}
