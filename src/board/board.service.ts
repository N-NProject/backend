import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { CreateBoardDto } from './dto/create-board';
import { UpdateBoardDto } from './dto/update-board';
import { UserService } from '../user/user.service';
import { LocationService } from '../location/location.service';
import { ChatRoomService } from '../chat-room/chat-room.service';
import { Observable, Subject } from 'rxjs';
import { BoardResponseDto } from './dto/board-response.dto';
import { Location } from '../location/entities/location.entity';
import { SseResponseDto } from '../sse/dto/sse-response.dto';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { PaginationBoardsResponseDto } from './dto/pagination-boards-response.dto';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { DeepPartial } from 'typeorm';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);
  private boardUpdates: { [key: number]: Subject<SseResponseDto> } = {}; // SSE updates management
  private currentCapacity: { [key: number]: number } = {}; // Track current capacity

  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    private readonly userService: UserService,
    private readonly locationService: LocationService,
    private readonly chatRoomService: ChatRoomService,
    private readonly jwtService: JwtService,
  ) {}

  async createBoard(
    createBoardDto: CreateBoardDto,
    request: Request,
  ): Promise<BoardResponseDto> {
    const token = request.cookies['accessToken'];

    if (!token) {
      throw new UnauthorizedException('JWT token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.userService.findOne(payload.sub);

      this.logger.log(`Received JWT token for user ID: ${user.id}`);

      const newLocation = await this.getOrCreateLocation(
        createBoardDto.location,
        createBoardDto.locationName,
      );

      const board = this.boardRepository.create({
        user,
        ...createBoardDto,
        location: newLocation as DeepPartial<Location>,
        max_capacity: createBoardDto.maxCapacity,
        start_time: createBoardDto.startTime,
      });

      const savedBoard = await this.boardRepository.save(board);
      this.logger.log(`Board created with ID: ${savedBoard.id}`);

      const chatRoom = await this.chatRoomService.findOrCreateChatRoom(
        savedBoard.id,
      );
      this.logger.log(`Chat room linked with board ID: ${savedBoard.id}`);

      savedBoard.chat_room = chatRoom;
      await this.boardRepository.save(savedBoard);

      await this.chatRoomService.joinChatRoom(chatRoom.id, token);
      this.logger.log(`User ${user.id} joined chat room ID: ${chatRoom.id}`);

      return this.toBoardResponseDto(
        savedBoard,
        user.id,
        this.currentCapacity[savedBoard.id] || 0,
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        this.logger.error('Token has expired:', error);
        throw new UnauthorizedException(
          'Your session has expired. Please log in again.',
        );
      } else {
        this.logger.error('An error occurred while creating the board:', error);
        throw new UnauthorizedException('Invalid token.');
      }
    }
  }

  async findAll(
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginationBoardsResponseDto> {
    const { page, limit } = paginationParams;
    const skip = (page - 1) * limit;

    const [boards, totalCount] = await this.boardRepository.findAndCount({
      relations: ['user', 'location'],
      skip,
      take: limit,
      order: { updatedAt: 'DESC' },
    });

    const totalPage = Math.ceil(totalCount / limit);

    const data = await Promise.all(
      boards.map(async (board) => {
        const currentCapacity =
          await this.chatRoomService.getCurrentCapacityForBoard(board.id);
        this.currentCapacity[board.id] = currentCapacity; // 초기 용량 저장
        return this.toBoardResponseDto(board, undefined, currentCapacity);
      }),
    );

    return {
      data,
      currentCount: data.length,
      page,
      limit,
      totalPage,
    };
  }

  async findOne(id: number, userId: number): Promise<BoardResponseDto> {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ['user', 'location'],
    });

    if (!board) {
      throw new NotFoundException(`ID가 ${id}인 게시판을 찾을 수 없습니다.`);
    }

    if (!this.boardUpdates[id]) {
      this.boardUpdates[id] = new Subject<SseResponseDto>();
    }

    const currentCapacity =
      await this.chatRoomService.getCurrentCapacityForBoard(id);
    this.currentCapacity[id] = currentCapacity;

    return this.toBoardResponseDto(board, userId, currentCapacity);
  }

  public async handleBoardUpdate(boardId: number): Promise<void> {
    const chatRoom = await this.chatRoomService.findChatRoomByBoardId(boardId); // chatRoomId를 얻기 위해 추가
    const currentCapacity =
      await this.chatRoomService.getCurrentCapacityForBoard(boardId);

    if (this.currentCapacity[boardId] !== currentCapacity) {
      this.currentCapacity[boardId] = currentCapacity;
      const sseResponse: SseResponseDto = {
        currentPerson: currentCapacity,
        nickName: '', // 빈 문자열을 사용하여 nickName을 처리
        chatRoomId: chatRoom.id, // chatRoomId를 추가
      };
      if (this.boardUpdates[boardId]) {
        this.boardUpdates[boardId].next(sseResponse);
      }
    }
  }
  async updateBoard(
    id: number,
    userId: number,
    updateBoardDto: UpdateBoardDto,
  ): Promise<BoardResponseDto> {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ['user', 'location'],
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    if (board.user.id !== userId) {
      throw new UnauthorizedException(
        'You do not have permission to update this board.',
      );
    }

    const updatedLocation = updateBoardDto.location
      ? await this.locationService.updateLocation({
          ...board.location,
          ...updateBoardDto.location,
          location_name: updateBoardDto.locationName,
        })
      : board.location;

    const updatedBoard = this.boardRepository.merge(board, {
      ...updateBoardDto,
      location: updatedLocation,
      start_time: updateBoardDto.startTime || board.start_time,
    });

    const savedBoard = await this.boardRepository.save(updatedBoard);

    return this.toBoardResponseDto(
      savedBoard,
      userId,
      this.currentCapacity[id] || 0,
    );
  }

  async removeBoard(id: number): Promise<void> {
    const board = await this.boardRepository.findOne({ where: { id } });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    await this.boardRepository.remove(board);
  }

  getBoardUpdates(id: number): Observable<SseResponseDto> {
    if (!this.boardUpdates[id]) {
      this.boardUpdates[id] = new Subject<SseResponseDto>();
    }
    return this.boardUpdates[id].asObservable();
  }

  public toBoardResponseDto(
    board: Board,
    userId: number,
    currentCapacity: number, // 이 값은 currentCapacity로 불립니다.
  ): BoardResponseDto {
    const {
      id,
      title,
      max_capacity,
      description,
      start_time,
      date,
      category,
      createdAt,
      updatedAt,
      deletedAt,
      user,
      location,
    } = board;

    const status = new Date(board.date) > new Date() ? 'OPEN' : 'CLOSE';
    const editable = user.id === userId;

    return {
      id,
      title,
      maxCapacity: max_capacity,
      currentCapacity, // Initial current person count를 currentCapacity로 설정
      description,
      startTime: start_time,
      date,
      category,
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.location_name,
      },
      createdAt,
      updatedAt,
      deletedAt,
      status,
      editable,
      user: userId ? { userId: user.id, username: user.username } : undefined,
    };
  }

  private async getOrCreateLocation(
    location: { latitude: number; longitude: number },
    location_name: string,
  ): Promise<Location> {
    let newLocation = await this.locationService.findLocationByCoordinates(
      location.latitude,
      location.longitude,
    );

    if (!newLocation) {
      newLocation = await this.locationService.createLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        location_name,
      });
    } else {
      newLocation.location_name = location_name;
      await this.locationService.updateLocation(newLocation);
    }

    return newLocation;
  }
}
