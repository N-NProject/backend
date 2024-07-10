import { ApiProperty } from '@nestjs/swagger';

export class SseResponseDto {
  @ApiProperty({ description: '현재 보드에 참여한 인원 수' })
  currentPerson: number;

  @ApiProperty({ description: '참여한 사용자 이름' })
  nickName: string;
}
