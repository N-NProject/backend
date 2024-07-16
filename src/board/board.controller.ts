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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateBoardDto } from './dto/update-board';
import { BoardResponseDto } from './dto/board-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Token } from '../auth/auth.decorator';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { PaginationBoardsResponseDto } from './dto/pagination-boards-response.dto';

@ApiTags('Boards')
@Controller('api/v1/boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  // TODO : 토큰을 넣도록 수정할 가능성 존재
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
  @ApiOperation({ summary: '모든 게시물 조회' })
  @Get()
  async findAll(
    @Query() paginationParams?: PaginationParamsDto,
  ): Promise<PaginationBoardsResponseDto> {
    return this.boardService.findAll(paginationParams);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '새 게시물 생성' })
  @UseGuards(AuthGuard)
  @Post()
  async create(
    @Body(ValidationPipe) createBoardDto: CreateBoardDto,
    @Token('sub') userId: number,
  ): Promise<BoardResponseDto> {
    return this.boardService.createBoard(userId, createBoardDto);
  }

  @ApiOperation({ summary: '특정 게시물 조회' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: number,
    @Token('sub') userId: number,
  ): Promise<BoardResponseDto> {
    return this.boardService.findOne(id, userId);
  }

  @ApiOperation({ summary: '게시물 업데이트' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body(ValidationPipe) updateBoardDto: UpdateBoardDto,
    @Token('sub') userId: number,
  ): Promise<BoardResponseDto> {
    return this.boardService.updateBoard(id, userId, updateBoardDto);
  }

  @ApiOperation({ summary: '게시물 삭제' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<{ message: string }> {
    await this.boardService.removeBoard(id);
    return { message: 'board가 성공적으로 삭제되었습니다.' };
  }

  @ApiOperation({ summary: '현재 참여한 인원 조회' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get(':id/current-person')
  async getCurrentPerson(
    @Param('id') id: number,
  ): Promise<{ currentPerson: number }> {
    const currentPerson = this.boardService.getCurrentCapacity(id);
    return { currentPerson };
  }

  @ApiOperation({ summary: '게시물 참여하기' })
  @ApiBody({ schema: { properties: { userId: { type: 'number' } } } })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post(':id/access')
  async accessBoard(
    @Param('id') id: number,
    @Body('userId') userId: number,
  ): Promise<{ message: string }> {
    await this.boardService.userAcessBoard(id, userId);
    return { message: '게시물에 참가자가 참여했습니다.' };
  }

  @ApiOperation({ summary: '게시물 떠나기' })
  @ApiBody({ schema: { properties: { userId: { type: 'number' } } } })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post(':id/leave')
  async leaveBaord(
    @Param('id') id: number,
    @Body('userId') userId: number,
  ): Promise<{ message: string }> {
    await this.boardService.userLeaveBoard(id, userId);
    return { message: '게시물에서 참가자가 나갔습니다' };
  }
}
