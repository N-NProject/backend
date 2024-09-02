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
import { BoardIdDto } from './dto/boardId.dto';
import { JwtService } from '@nestjs/jwt';

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
  @Get(':boardId')
  async findOne(
    @Param() boardIdDto: BoardIdDto,
    @Req() req: Request,
  ): Promise<BoardResponseDto> {
    const { boardId } = boardIdDto;

    // 쿠키에서 JWT 토큰을 추출
    const token = req.cookies['accessToken'];

    if (!token) {
      throw new UnauthorizedException('JWT 토큰이 쿠키에 없습니다.');
    }

    // JwtService를 이용해 토큰 디코딩
    const jwtService = new JwtService({ secret: 'JWT_SECRET' });
    const decodedToken = jwtService.decode(token) as any;

    // sub 클레임에서 userId 추출
    const userId = decodedToken?.sub;
    if (!userId) {
      throw new UnauthorizedException('유효한 사용자 ID가 아닙니다.');
    }

    console.log(`${boardId}가 있습니다`, boardIdDto);
    console.log(`userId: ${userId}`); // userId 로그 출력

    return this.boardService.findOne(boardId, userId);
  }
  @ApiOperation({ summary: '게시물 업데이트' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Patch(':boardId')
  async update(
    @Param() boardIdDto: BoardIdDto,
    @Body(ValidationPipe) updateBoardDto: UpdateBoardDto,
    @Token('sub') userId: number,
  ): Promise<BoardResponseDto> {
    const { boardId } = boardIdDto;
    return this.boardService.updateBoard(boardId, userId, updateBoardDto);
  }

  @Delete(':boardId')
  @ApiOperation({ summary: '게시물 삭제' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async remove(
    @Param() boardIdDto: BoardIdDto,
    @Token('sub') userId: number,
  ): Promise<{ message: string }> {
    console.log('${boardId}가 있습니다', boardIdDto);
    const { boardId } = boardIdDto;
    await this.boardService.removeBoard(boardId, userId);
    return { message: 'board가 성공적으로 삭제되었습니다.' };
  }
}
