import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
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
import { User } from '../user/entities/user.entity';
import { Request } from 'express';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);
  private boardUpdates: { [key: number]: Subject<SseResponseDto> } = {}; //sse 업데이트 관리
  private currentCapacity: { [key: number]: number } = {}; //현재 인원 수 관리
  private participants: { [key: number]: Set<number> } = {}; //참가자 관리

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
      // Verify the token using a consistent method
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
      this.logger.log(`게시판이 생성되었습니다. 게시판 ID: ${savedBoard.id}`);

      const chatRoom = await this.chatRoomService.findOrCreateChatRoom(
        savedBoard.id,
      );
      this.logger.log(
        `게시판 ID: ${savedBoard.id}와 연결된 채팅방 ID: ${chatRoom.id}`,
      );

      savedBoard.chat_room = chatRoom;
      await this.boardRepository.save(savedBoard);

      await this.chatRoomService.joinChatRoom(chatRoom.id, token);
      this.logger.log(
        `사용자 ${user.id}가 채팅방 ID: ${chatRoom.id}에 참여하였습니다`,
      );

      return this.toBoardResponseDto(savedBoard, user.id, false);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        this.logger.error('유효하지 않은 토큰: ', error);
        throw new UnauthorizedException(
          'Your session has expired. Please log in again.',
        );
      } else {
        this.logger.error(
          'An error occurred while creating the board: ',
          error,
        );
        throw new UnauthorizedException('Invalid token.');
      }
    }
  }

  async findOne(id: number, userId: number): Promise<BoardResponseDto> {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ['user', 'location'],
    });
    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }
    return this.toBoardResponseDto(board, userId, false);
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
      throw new NotFoundException(`ID가 ${id}인 게시물을 찾을 수 없습니다.`);
    }

    // 사용자 권한 검사
    if (board.user.id !== userId) {
      throw new UnauthorizedException(
        '이 게시물을 업데이트할 권한이 없습니다.',
      );
    }

    // 위치 정보 업데이트 (DTO에서 제공되었을 경우)
    const updatedLocation = updateBoardDto.location
      ? await this.locationService.updateLocation({
          ...board.location,
          ...updateBoardDto.location,
          location_name: updateBoardDto.locationName,
        })
      : board.location;

    // DTO와 기존 게시물을 병합
    const updatedBoard = this.boardRepository.merge(board, {
      ...updateBoardDto,
      location: updatedLocation,
      start_time: updateBoardDto.startTime || board.start_time,
    });

    // 업데이트된 게시물 저장
    const savedBoard = await this.boardRepository.save(updatedBoard);

    // 업데이트된 게시물을 응답 형식으로 변환하여 반환
    return this.toBoardResponseDto(savedBoard, userId, false);
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

  getCurrentCapacity(boardId: number): number {
    return this.currentCapacity[boardId] || 0;
  }

  public toBoardResponseDto(
    board: Board,
    userId: number,
    inital: boolean,
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
    const currentPerson = inital
      ? this.currentCapacity[id] || 0
      : this.currentCapacity[id] || 0;
    const editable = user.id === userId;
    return {
      id,
      title,
      maxCapacity: max_capacity,
      currentPerson,
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

  async findAll(
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginationBoardsResponseDto> {
    const { page, limit } = paginationParams;
    const skip = (page - 1) * limit;

    const [boards, totalCount] = await this.boardRepository.findAndCount({
      relations: ['user', 'location'],
      skip,
      take: limit,
      order: {
        updatedAt: 'DESC',
      },
    });

    const totalPage = Math.ceil(totalCount / limit);
    const data = boards.map((board, index) =>
      this.toBoardResponseDto(board, undefined, index === 0),
    );
    return {
      data,
      currentCount: data.length,
      page,
      limit,
      totalPage,
    };
  }

  private getBoardStatus(boardDate: string): string {
    const now = new Date();
    const date = new Date(boardDate);
    return date > now ? 'OPEN' : 'CLOSED';
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
