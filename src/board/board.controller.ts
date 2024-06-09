import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board';
import { ApiTags } from '@nestjs/swagger';
import { UpdateBoardDto } from './dto/update-board';
import { Board } from './entities/board.entity';

@ApiTags('Boards')
@Controller('api/v1/boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  async create(@Body() createBoardDto: CreateBoardDto) {
    const board = await this.boardService.createBoard(createBoardDto);
    return this.formatBoardResponse(board);
  }

  @Get()
  async findAll() {
    const boards = await this.boardService.findAll();
    return boards.map(this.formatBoardResponse);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    const board = await this.boardService.findOne(id);
    return this.formatBoardResponse(board);
  }

  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateBoardDto: UpdateBoardDto,
  ) {
    const updatedBoard = await this.boardService.updateBoard(
      id,
      updateBoardDto,
    );
    return this.formatBoardResponse(updatedBoard);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.boardService.removeBoard(id);
    return { message: 'Board removed successfully' };
  }

  private formatBoardResponse(board: Board) {
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
