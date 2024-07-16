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
  ValidationPipe,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UpdateBoardDto } from './dto/update-board';
import { BoardResponseDto } from './dto/board-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Token } from '../auth/auth.decorator';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { PaginationBoardsResponseDto } from './dto/pagination-boards-response.dto';
import { validate } from 'class-validator';
import { validatePath } from '@nestjs/swagger/dist/utils/validate-path.util';

@ApiTags('Boards')
@Controller('api/v1/boards')
@UseGuards(AuthGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '새 게시물 생성' })
  async create(
    @Body(ValidationPipe) createBoardDto: CreateBoardDto,
    @Token('sub') userId: number,
  ): Promise<BoardResponseDto> {
    return this.boardService.createBoard(userId, createBoardDto);
  }

  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '페이지 번호',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '페이지 당 게시글 수',
  })
  @Get()
  @ApiBearerAuth()
  async findAll(
    @Query() paginationParams?: PaginationParamsDto,
  ): Promise<PaginationBoardsResponseDto> {
    return this.boardService.findAll(paginationParams);

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 게시물 조회' })
  async findOne(
    @Param('id') id: number,
    @Token('sub') userId: number,
  ): Promise<BoardResponseDto> {
    return this.boardService.findOne(id, userId);

  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '모든 게시물 조회' })
  async findAll(@Token('sub') userId: number): Promise<BoardResponseDto[]> {
    const boards = await this.boardService.findAll();
    return boards.map((board) =>
      this.boardService.toBoardResponseDto(board, userId),
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시물 업데이트' })
  async update(
    @Param('id') id: number,
    @Body(ValidationPipe) updateBoardDto: UpdateBoardDto,
    @Token('sub') userId: number,
  ): Promise<BoardResponseDto> {
    return this.boardService.updateBoard(id, userId, updateBoardDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시물 삭제' })
  async remove(@Param('id') id: number): Promise<{ message: string }> {
    await this.boardService.removeBoard(id);
    return { message: 'board가 성공적으로 삭제되었습니다.' };
  }

  @Get(':id/current-person')
  @ApiOperation({ summary: '현재 참여한 인원 조회' })
  @ApiBearerAuth()
  async getCurrentPerson(
    @Param('id') id: number,
  ): Promise<{ currentPerson: number }> {
    const currentPerson = this.boardService.getCurrentCapacity(id);
    return { currentPerson };
  }

  @Post(':id/access')
  @ApiOperation({ summary: '게시물 참여하기' })
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
  @ApiOperation({ summary: '게시물 떠나기' })
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
