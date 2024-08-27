import { IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class BoardIdDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  boardId: number;
}
