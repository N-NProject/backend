import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class BoardIdDto {
  @ApiProperty({ description: '게시글 id' })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  boardId: number;
}
