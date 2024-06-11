import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
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

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);
  private boardUpdates: { [key: number]: Subject<any> } = {};
  private currentCapacity: { [key: number]: number } = {};
  private participants: { [key: number]: Set<number> } = {};

  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    private readonly userService: UserService,
    private readonly locationService: LocationService,
    private readonly chatRoomService: ChatRoomService,
  ) {}

  async createBoard(createBoardDto: CreateBoardDto): Promise<BoardResponseDto> {
    const user = await this.userService.findOne(createBoardDto.user_id);
    const newLocation = await this.getOrCreateLocation(
      createBoardDto.location,
      createBoardDto.location_name,
    );

    const board = this.boardRepository.create({
      user,
      ...createBoardDto,
      location: newLocation as DeepPartial<Location>,
    });

    const savedBoard = await this.boardRepository.save(board);
    await this.chatRoomService.findOrCreateChatRoom(board.id);

    return this.toBoardResponseDto(savedBoard);
  }

  async findAll(): Promise<BoardResponseDto[]> {
    const boards = await this.boardRepository.find({
      relations: ['user', 'location'],
    });
    return boards.map((board) => this.toBoardResponseDto(board));
  }

  async findOne(id: number): Promise<BoardResponseDto> {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ['user', 'location'],
    });
    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }
    return this.toBoardResponseDto(board);
  }

  async updateBoard(
    id: number,
    updateBoardDto: UpdateBoardDto,
  ): Promise<BoardResponseDto> {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ['user', 'location'],
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    // Update user if userId is provided in the DTO
    if (updateBoardDto.userId && updateBoardDto.userId !== board.user.id) {
      const user = await this.userService.findOne(updateBoardDto.userId);
      if (!user) {
        throw new NotFoundException(
          `User with ID ${updateBoardDto.userId} not found`,
        );
      }
      board.user = user;
    }

    // Update location if provided in the DTO
    const updatedLocation = updateBoardDto.location
      ? await this.locationService.updateLocation({
          ...board.location,
          ...updateBoardDto.location,
          location_name: updateBoardDto.location_name,
        })
      : board.location;

    // Merge the rest of the DTO with the existing board
    const updatedBoard = this.boardRepository.merge(board, {
      ...updateBoardDto,
      location: updatedLocation,
    });

    const savedBoard = await this.boardRepository.save(updatedBoard);

    return this.toBoardResponseDto(savedBoard);
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

  async userAcessBoard(boardId: number, userId: number) {
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
    });
    const user = await this.userService.findOne(userId);

    if (!board) {
      throw new NotFoundException(`Board with ID ${boardId} not found`);
    }

    if (!this.boardUpdates[boardId]) {
      this.boardUpdates[boardId] = new Subject<SseResponseDto>();
    }

    if (!this.currentCapacity[boardId]) {
      this.currentCapacity[boardId] = 0;
    }

    if (!this.participants[boardId]) {
      this.participants[boardId] = new Set<number>();
    }

    if (this.currentCapacity[boardId] >= board.max_capacity) {
      throw new Error('제한 인원이 다 찼습니다');
    }

    this.currentCapacity[boardId] += 1;
    this.participants[boardId].add(userId);

    this.logger.log(
      `user ${userId}가 board ${boardId}에 접근했습니다. 현재 인원: ${this.currentCapacity[boardId]}`,
    );

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[boardId];
    sseResponse.userId = user.id;

    this.logger.log(`SSE 이벤트 전송: ${JSON.stringify(sseResponse)}`);
    this.boardUpdates[boardId].next(sseResponse);
  }

  async userLeaveBoard(boardId: number, userId: number) {
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
    });
    const user = await this.userService.findOne(userId);

    if (!board) {
      throw new NotFoundException(`board ${boardId}를 찾을 수 없습니다`);
    }

    if (!this.boardUpdates[boardId]) {
      this.boardUpdates[boardId] = new Subject<SseResponseDto>();
    }

    if (!this.currentCapacity[boardId]) {
      this.currentCapacity[boardId] = 0;
    }

    if (!this.participants[boardId]) {
      this.participants[boardId] = new Set<number>();
    }

    if (!this.participants[boardId].has(userId)) {
      throw new Error(
        `User ${userId}는 board ${boardId}에 참가하지 않았습니다`,
      );
    }

    this.participants[boardId].delete(userId);

    if (this.currentCapacity[boardId] > 0) {
      this.currentCapacity[boardId] -= 1;
    } else {
      this.currentCapacity[boardId] = 0;
    }

    this.logger.log(
      `User ${userId}가 board ${boardId}에서 나갔습니다. 현재 인원 : ${this.currentCapacity[boardId]}`,
    );

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = this.currentCapacity[boardId];
    sseResponse.userId = user.id;

    this.logger.log(`SSE 이벤트 전송: ${JSON.stringify(sseResponse)}`);
    this.boardUpdates[boardId].next(sseResponse);
  }

  private toBoardResponseDto(board: Board): BoardResponseDto {
    const status = new Date(board.date) > new Date() ? 'OPEN' : 'CLOSED';

    return {
      id: board.id,
      title: board.title,
      max_capacity: board.max_capacity,
      currentPerson: this.currentCapacity[board.id] || 0,
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
      status,
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
