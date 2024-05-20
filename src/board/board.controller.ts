import { Body, Controller, Post } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Boards')
@Controller('api/v1/board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  async create(@Body() createBoardDto: CreateBoardDto) {
    const board = await this.boardService.createBoard(createBoardDto);
    return {
      id: board.id,
      title: board.title,
      max_capacity: board.max_capacity,
      description: board.description,
      start_time: board.start_time,
      category: board.category,
      user: {
        user_id: board.user.id,
        username: board.user.username,
      },
      location: {
        id: board.location.id,
        coordinate: board.location.coordinate,
        location_name: board.location.location_name,
        sequence: board.location.sequence,
      },
      created_at: board.created_at,
      updated_at: board.updated_at,
      deleted_at: board.deleted_at,
    };
  }
}
