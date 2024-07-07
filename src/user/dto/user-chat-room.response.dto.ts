import { ApiProperty } from '@nestjs/swagger';
import { Cursor } from '../../global/common/dto/cursor.dto';
import { BoardResponseDto } from '../../board/dto/board-response.dto';

class ChatRoomResponseDto {
  @ApiProperty({ example: 1 })
  readonly id: number;

  @ApiProperty({ type: [BoardResponseDto] })
  readonly board: BoardResponseDto[];
}

export class UserChatRoomResponseDto {
  @ApiProperty({ type: [ChatRoomResponseDto] })
  readonly chatRoom: ChatRoomResponseDto;

  @ApiProperty({ type: Cursor })
  readonly cursor: Cursor;
}
