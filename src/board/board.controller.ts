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
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { UpdateBoardDto } from './dto/update-board';
import { BoardResponseDto } from './dto/board-response.dto';

@ApiTags('Boards')
@Controller('api/v1/boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  async create(
    @Body() createBoardDto: CreateBoardDto,
  ): Promise<BoardResponseDto> {
    const board = await this.boardService.createBoard(createBoardDto);
    return board;
  }

  @Get()
  async findAll(): Promise<BoardResponseDto[]> {
    const boards = await this.boardService.findAll();
    return boards;
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<BoardResponseDto> {
    const board = await this.boardService.findOne(id);
    return board;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBoardDto: UpdateBoardDto,
  ): Promise<BoardResponseDto> {
    const updatedBoard = await this.boardService.updateBoard(
      Number(id),
      updateBoardDto,
    );
    return updatedBoard;
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<{ message: string }> {
    await this.boardService.removeBoard(id);
    return { message: 'board가 성공적으로 삭제되었습니다.' };
  }

  @Get(':id/current-person')
  async getCurrentPerson(
    @Param('id') id: number,
  ): Promise<{ currentPerson: number }> {
    const currentPerson = this.boardService.getCurrentCapacity(id);
    return { currentPerson };
  }

  @Post(':id/access')
  @ApiBody({ schema: { properties: { userId: { type: 'number' } } } })
  async accessBoard(
    @Param('id') id: number,
    @Body('userId') userId: number,
  ): Promise<{ message: string }> {
    await this.boardService.userAcessBoard(id, userId);
    return { message: '게시물에 참가자가 참여했습니다.' };
  }

  @Post(':id/leave')
  @ApiBody({ schema: { properties: { userId: { type: 'number' } } } })
  async leaveBaord(
    @Param('id') id: number,
    @Body('userId') userId: number,
  ): Promise<{ message: string }> {
    await this.boardService.userLeaveBoard(id, userId);
    return { message: '게시물에서 참가자가 나갔습니다' };
  }
}
