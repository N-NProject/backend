import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { CreateBoardDto } from './dto/create-board';
import { UpdateBoardDto } from './dto/update-board';
import { LocationService } from '../location/location.service';
import { ChatRoomService } from '../chat-room/chat-room.service';
import { Subject } from 'rxjs';
import { BoardResponseDto } from './dto/board-response.dto';
import { Location } from '../location/entities/location.entity';
import { SseResponseDto } from '../sse/dto/sse-response.dto';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { PaginationBoardsResponseDto } from './dto/pagination-boards-response.dto';
import { Message } from '../message/entities/message.entity';
import { User } from '../user/entities/user.entity';
import { ChatRoom } from '../chat-room/entities/chat-room.entity';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);
  private boardUpdates: { [key: number]: Subject<SseResponseDto> } = {};
  private currentCapacity: { [key: number]: number } = {};

  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly locationService: LocationService,
    private readonly chatRoomService: ChatRoomService,
    private dataSource: DataSource,
  ) {}

  async createBoard(
    createBoardDto: CreateBoardDto,
    userId: number,
  ): Promise<BoardResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user: User = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const newLocation: Location = await this.getOrCreateLocation(
        createBoardDto.location,
        createBoardDto.locationName,
      );

      const board: Board = this.boardRepository.create({
        user,
        ...createBoardDto,
        location: newLocation as DeepPartial<Location>,
        max_capacity: createBoardDto.maxCapacity,
        start_time: createBoardDto.startTime,
      });

      const savedBoard: Board = await queryRunner.manager.save(board);

      // 채팅방 생성 로직을 트랜잭션 내부로 이동
      const chatRoom: ChatRoom =
        await this.chatRoomService.createChatRoomForBoard(
          queryRunner,
          savedBoard,
          user,
        );

      // Board에 ChatRoom을 연결
      savedBoard.chat_room = chatRoom;
      await queryRunner.manager.save(savedBoard);

      await queryRunner.commitTransaction();

      this.logger.log(
        `게시판과 채팅방이 생성되었습니다. Board ID: ${savedBoard.id}, ChatRoom ID: ${chatRoom.id}`,
      );

      console.log(chatRoom.member_count);

      return this.toBoardResponseDto(
        savedBoard,
        user.id,
        chatRoom.member_count, // 채팅방의 현재 인원수를 보여주도록 했으나, currentCapacity 객체의 값이 필요해지면 변경이 필요함.
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err.code === '23505') {
        this.logger.error('중복된 ChatRoom 연결 시도', err.stack);
        throw new ConflictException(
          '이 게시판에는 이미 채팅방이 연결되어 있습니다.',
        );
      }
      this.logger.error('게시판 생성 중 오류가 발생했습니다', err.stack);
      throw new InternalServerErrorException(
        '게시판을 생성하는 중 오류가 발생했습니다',
      );
    } finally {
      await queryRunner.release();
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

    const currentCapacity =
      await this.chatRoomService.getCurrentCapacityForBoard(id);
    const editable = board.user.id === userId;

    return this.toBoardResponseDto(board, userId, currentCapacity);
  }

  public async handleBoardUpdate(boardId: number): Promise<void> {
    const chatRoom = await this.chatRoomService.findChatRoomByBoardId(boardId);
    const currentCapacity =
      await this.chatRoomService.getCurrentCapacityForBoard(boardId);

    if (this.currentCapacity[boardId] !== currentCapacity) {
      this.currentCapacity[boardId] = currentCapacity;
      const sseResponse: SseResponseDto = {
        currentPerson: currentCapacity,
        nickName: '', // 빈 문자열을 사용하여 nickName을 처리
        chatRoomId: chatRoom.id,
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

  async removeBoard(id: number, userId: number): Promise<void> {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ['user', 'chat_room', 'chat_room.messages'],
    });

    if (!board) {
      throw new NotFoundException(`ID가 ${id}인 게시판을 찾을 수 없습니다.`);
    }

    if (board.user.id !== userId) {
      throw new UnauthorizedException('이 게시판을 삭제할 권한이 없습니다.');
    }

    // 먼저 관련된 메시지를 삭제합니다.
    if (board.chat_room?.messages) {
      await this.messageRepository.remove(board.chat_room.messages);
    }

    await this.boardRepository.remove(board);
  }

  public toBoardResponseDto(
    board: Board,
    userId: number | undefined,
    currentCapacity: number,
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

    // 기본 response 객체 생성 (editable 없이)
    const response: BoardResponseDto = {
      id,
      title,
      maxCapacity: max_capacity,
      currentCapacity,
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
      user: user ? { userId: user.id, username: user.username } : undefined,
    };

    // userId가 있는 경우에만 editable을 추가
    if (userId !== undefined) {
      response.editable = user.id === userId;
    }

    return response;
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
