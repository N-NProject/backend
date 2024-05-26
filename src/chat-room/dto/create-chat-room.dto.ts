import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatRoomDto {
  @ApiProperty({ description: '채팅방의 최대 인원', example: 10 })
  @IsInt()
  @Min(1)
  maxMember: number;
}
