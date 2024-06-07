import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChatRoomIdDto {
  @ApiProperty({ description: '채팅방 id' })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  chatRoomId: number;
}
