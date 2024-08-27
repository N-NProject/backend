import { Controller, Param, Sse } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ChatRoomService } from '../chat-room/chat-room.service';
import { SseResponseDto } from '../sse/dto/sse-response.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Sse')
@Controller('sse')
export class SseController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Sse('board/:boardId')
  async sse(
    @Param('boardId') boardId: number,
  ): Promise<Observable<{ data: string }>> {
    const roomUpdates$ =
      await this.chatRoomService.getRoomUpdatesByBoardId(boardId);
    return roomUpdates$.pipe(
      map((data: SseResponseDto) => ({
        data: JSON.stringify(data),
      })),
    );
  }
}
