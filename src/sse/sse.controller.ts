import { Controller, Param, Sse } from '@nestjs/common';
import { BoardService } from '../board/board.service';
import { map, Observable } from 'rxjs';
import { MessageEvent } from './message-evnet.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Sse')
@Controller('sse')
export class SseController {
  constructor(private readonly boardService: BoardService) {}

  @Sse('board/:id')
  sse(@Param('id') id: number): Observable<MessageEvent> {
    return this.boardService.getBoardUpdates(id).pipe(
      map((data) => ({
        data,
      })),
    );
  }
}
