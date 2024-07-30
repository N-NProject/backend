import {
  Injectable,
  Logger,
  NotFoundException,
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
import e from 'express';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);
  private boardUpdates: { [key: number]: Subject<any> } = {};
  private currentCapacity: { [key: number]: number } = {};
  private participants: { [key: number]: Set<string> } = {};

  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    private readonly userService: UserService,
    private readonly locationService: LocationService,
    private readonly chatRoomService: ChatRoomService,
    private readonly jwtService: JwtService,
  ) {}

  async createBoard(
    userId: number,
    createBoardDto: CreateBoardDto,
  ): Promise<BoardResponseDto> {
    const user = await this.userService.findOne(userId);
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

    // ChatRoom을 Board 엔티티에 설정
    savedBoard.chat_room = chatRoom;
    await this.boardRepository.save(savedBoard);

    await this.chatRoomService.joinChatRoom(chatRoom.id, userId);
    this.logger.log(
      `사용자 ${userId}가 채팅방 ID: ${chatRoom.id}에 참여하였습니다`,
    );

    return this.toBoardResponseDto(savedBoard, userId);
  }

  /** 게시글 전체 조회 */
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
    const data = boards.map((board) => this.toBoardResponseDto(board));

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
      throw new NotFoundException(`Board with ID ${id} not found`);
    }
    return this.toBoardResponseDto(board, userId);
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
    return this.toBoardResponseDto(savedBoard, userId);
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

  async userAcessBoard(boardId: number, token: string) {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch (err) {
      throw new UnauthorizedException('유효하지 않은 토큰');
    }
    const userId = payload.userId;

    const board = await this.boardRepository.findOne({
      where: { id: boardId },
    });
    if (!board) {
      throw new NotFoundException(`board ${boardId}를 찾을 수 없습니다`);
    }

    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException('user를 찾을 수 없습니다');
    }

    if (!this.boardUpdates[boardId]) {
      this.boardUpdates[boardId] = new Subject<SseResponseDto>();
    }
    if (!this.currentCapacity[boardId]) {
      this.currentCapacity[boardId] = 0;
    }
    if (!this.participants[boardId]) {
      this.participants[boardId] = new Set<string>(); // Set<number> -> Set<string>
    }

    if (this.participants[boardId].has(token)) {
      throw new Error(`User는 이미 board ${boardId}에 참가했습니다`);
    }

    this.participants[boardId].add(token);

    if (this.currentCapacity[boardId] >= board.max_capacity) {
      throw new Error('제한 인원이 다 찼습니다');
    }

    this.currentCapacity[boardId] += 1;

    this.logger.log(
      `Token ${token}가 board ${boardId}에 접근했습니다. 현재 인원: ${this.currentCapacity[boardId]}`,
    );

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[boardId];
    sseResponse.nickName = user.username;

    this.logger.log(`SSE 이벤트 전송: ${JSON.stringify(sseResponse)}`);
    this.boardUpdates[boardId].next(sseResponse);
  }

  async userLeaveBoard(boardId: number, token: string) {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch (err) {
      throw new UnauthorizedException('유효하지 않은 토큰');
    }
    const userId = payload.userId;

    const board = await this.boardRepository.findOne({
      where: { id: boardId },
    });
    if (!board) {
      throw new NotFoundException(`board ${boardId}를 찾을 수 없습니다`);
    }

    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    if (!this.boardUpdates[boardId]) {
      this.boardUpdates[boardId] = new Subject<SseResponseDto>();
    }
    if (!this.currentCapacity[boardId]) {
      this.currentCapacity[boardId] = 0;
    }
    if (!this.participants[boardId]) {
      this.participants[boardId] = new Set<string>(); // Set<number> -> Set<string>
    }

    if (!this.participants[boardId].has(token)) {
      throw new Error(`User는 board ${boardId}에 참가하지 않았습니다`);
    }

    this.participants[boardId].delete(token);

    if (this.currentCapacity[boardId] > 0) {
      this.currentCapacity[boardId] -= 1;
    } else {
      this.currentCapacity[boardId] = 0;
    }

    this.logger.log(
      `Token ${token}가 board ${boardId}에서 나갔습니다. 현재 인원: ${this.currentCapacity[boardId]}`,
    );

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[boardId];
    sseResponse.nickName = user.username;

    this.logger.log(`SSE 이벤트 전송: ${JSON.stringify(sseResponse)}`);
    this.boardUpdates[boardId].next(sseResponse);
  }

  public toBoardResponseDto(board: Board, userId?: number): BoardResponseDto {
    const status = new Date(board.date) > new Date() ? 'OPEN' : 'CLOSED';

    const response: BoardResponseDto = {
      id: board.id,
      title: board.title,
      maxCapacity: board.max_capacity,
      currentPerson: this.currentCapacity[board.id] || 0,
      description: board.description,
      startTime: board.start_time,
      date: board.date,
      category: board.category,
      location: {
        id: board.location.id,
        latitude: board.location.latitude,
        longitude: board.location.longitude,
        locationName: board.location.location_name,
      },
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      deletedAt: board.deletedAt,
      status,
      editable: board.user.id === userId,
    };

    if (userId) {
      response.user = {
        userId: board.user.id,
        username: board.user.username,
      };
    }

    return response;
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
