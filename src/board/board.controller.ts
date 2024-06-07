import { Body, Controller, Post } from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Boards')
@Controller('api/v1/boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) { }

  @Post()
  async create(@Body() createBoardDto: CreateBoardDto) {
    const board = await this.boardService.createBoard(createBoardDto);
    return {
      id: board.id,
      title: board.title,
      max_capacity: board.max_capacity,
      description: board.description,
      start_time: board.start_time,
      date: board.date,
      category: board.category,
      user: {
        user_id: board.user.id,
        username: board.user.username,
      },
      location: {
        id: board.location.id,
        latitude: board.location.latitude,
        longitude: board.location.longitude,
        location_name: board.location.location_name,
      },
      created_at: board.createdAt,
      updated_at: board.updatedAt,
      deleted_at: board.deletedAt,
    };
  }
}
