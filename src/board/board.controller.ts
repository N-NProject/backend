import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { UpdateBoardDto } from './dto/update-board';
import { BoardResponseDto } from './dto/board-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Token } from '../auth/auth.decorator';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { PaginationBoardsResponseDto } from './dto/pagination-boards-response.dto';

@ApiTags('Boards')
@Controller('api/v1/boards')
@UseGuards(AuthGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  @ApiBearerAuth()
  async create(
    @Body() createBoardDto: CreateBoardDto,
    @Token() token: any,
  ): Promise<BoardResponseDto> {
    const newBoardDto = {
      ...createBoardDto,
      userId: token.sub,
    };
    const board = await this.boardService.createBoard(newBoardDto);
    return board;
  }

  @Get()
  @ApiBearerAuth()
  async findAll(
    @Query() paginationParams?: PaginationParamsDto,
  ): Promise<PaginationBoardsResponseDto> {
    return this.boardService.findAll(paginationParams);
  }

  @Get(':id')
  @ApiBearerAuth()
  async findOne(@Param('id') id: number): Promise<BoardResponseDto> {
    const board = await this.boardService.findOne(id);
    return board;
  }

  @Patch(':id')
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  async remove(@Param('id') id: number): Promise<{ message: string }> {
    await this.boardService.removeBoard(id);
    return { message: 'board가 성공적으로 삭제되었습니다.' };
  }

  @Get(':id/current-person')
  @ApiBearerAuth()
  async getCurrentPerson(
    @Param('id') id: number,
  ): Promise<{ currentPerson: number }> {
    const currentPerson = this.boardService.getCurrentCapacity(id);
    return { currentPerson };
  }

  @Post(':id/access')
  @ApiBearerAuth()
  @ApiBody({ schema: { properties: { userId: { type: 'number' } } } })
  async accessBoard(
    @Param('id') id: number,
    @Body('userId') userId: number,
  ): Promise<{ message: string }> {
    await this.boardService.userAcessBoard(id, userId);
    return { message: '게시물에 참가자가 참여했습니다.' };
  }

  @Post(':id/leave')
  @ApiBearerAuth()
  @ApiBody({ schema: { properties: { userId: { type: 'number' } } } })
  async leaveBaord(
    @Param('id') id: number,
    @Body('userId') userId: number,
  ): Promise<{ message: string }> {
    await this.boardService.userLeaveBoard(id, userId);
    return { message: '게시물에서 참가자가 나갔습니다' };
  }
}
