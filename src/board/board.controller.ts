import { Request } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board';
import {
  ApiBearerAuth,
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
    @Req() request: Request, // Request 객체를 사용하여 쿠키에서 토큰 추출
  ): Promise<BoardResponseDto> {
    const token = request.cookies?.accessToken; // 안전하게 접근하도록 수정
    if (!token) {
      throw new UnauthorizedException('JWT token is missing');
    }
    return this.boardService.createBoard(createBoardDto, request);
  }

  @ApiOperation({ summary: '특정 게시물 조회' })
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
}
