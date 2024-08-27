import { IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BoardIdDto {
  @ApiProperty({ description: '게시글 id' })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  boardId: number;
}
