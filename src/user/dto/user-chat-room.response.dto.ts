import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Cursor } from '../../global/common/dto/cursor.dto';
import { BoardResponseDto } from '../../board/dto/board-response.dto';

class ChatRoomResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  readonly id: number;

  @ApiProperty({ type: [BoardResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardResponseDto)
  readonly board: BoardResponseDto[];
}

export class UserChatRoomResponseDto {
  @ApiProperty({ type: ChatRoomResponseDto })
  @ValidateNested()
  @Type(() => ChatRoomResponseDto)
  readonly chatRoom: ChatRoomResponseDto;

  @ApiProperty({ type: Cursor })
  @ValidateNested()
  @Type(() => Cursor)
  readonly cursor: Cursor;
}
