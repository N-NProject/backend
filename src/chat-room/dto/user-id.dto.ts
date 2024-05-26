import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UserIdDto {
  @ApiProperty({ description: '유저 id' })
  @IsInt()
  userId: number;
}
