import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: '메시지 내용' })
  @IsString()
  content: string;
}
