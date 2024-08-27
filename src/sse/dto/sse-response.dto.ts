import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SseResponseDto {
  @ApiProperty({ description: '현재 보드에 참여한 인원 수' })
  @IsNumber()
  @IsNotEmpty()
  currentPerson: number;

  @ApiProperty({ description: '참여한 사용자 이름' })
  @IsString()
  @IsNotEmpty()
  nickName: string;

  @ApiProperty({ description: '참가한 게시글의 채팅방 id' })
  @IsNumber()
  @IsNotEmpty()
  chatRoomId: number;
}
