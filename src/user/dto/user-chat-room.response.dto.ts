import { BoardResponseDto } from '../../board/dto/board-response.dto';
import { ApiProperty } from '@nestjs/swagger';

class ChatRoomResponseDto {
  @ApiProperty({ example: 1 })
  readonly id: number;

  @ApiProperty({ type: [BoardResponseDto] })
  readonly board: BoardResponseDto[];
}

class Cursor {
  @ApiProperty({ example: 10 })
  readonly count: number;

  @ApiProperty({ example: 'Y3JlYXRlZEF0OjE2OTYzMTg5OTc5Mzg' })
  readonly afterCursor: string | null;

  @ApiProperty({ example: null })
  readonly beforeCursor: string | null;
}

export class UserChatRoomResponseDto {
  @ApiProperty({ type: [ChatRoomResponseDto] })
  readonly chatRoom: ChatRoomResponseDto;

  @ApiProperty({ type: Cursor })
  readonly cursor: Cursor;
}
