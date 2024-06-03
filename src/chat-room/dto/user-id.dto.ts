import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UserIdDto {
  @ApiProperty({ description: '유저 id' })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  userId: number;
}
