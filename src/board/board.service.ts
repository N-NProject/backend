import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, QueryRunner, Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { CreateBoardDto } from './dto/create-board';
import { UpdateBoardDto } from './dto/update-board';
import { LocationService } from '../location/location.service';
import { ChatRoomService } from '../chat-room/chat-room.service';
import { BoardResponseDto } from './dto/board-response.dto';
import { Location } from '../location/entities/location.entity';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { PaginationBoardsResponseDto } from './dto/pagination-boards-response.dto';
import { Message } from '../message/entities/message.entity';
import { User } from '../user/entities/user.entity';
import { ChatRoom } from '../chat-room/entities/chat-room.entity';
import { BoardMapper } from './dto/board.mapper';
import { ChatRoomMapper } from '../chat-room/dto/chat-room.mapper';

@Injectable()
export class BoardService {
  private readonly logger: Logger = new Logger(BoardService.name);

  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    private readonly locationService: LocationService,
    private readonly chatRoomService: ChatRoomService,
    private dataSource: DataSource,
    private readonly boardMapper: BoardMapper,
    private readonly chatRoomMapper: ChatRoomMapper,
  ) {}

  async createBoard(
    createBoardDto: CreateBoardDto,
    userId: number,
  ): Promise<BoardResponseDto> {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user: User = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(
          `ID가 ${userId}인 사용자를 찾을 수 없습니다.`,
        );
      }

      const newLocation: Location = await this.getOrCreateLocation(
        createBoardDto.location,
        createBoardDto.locationName,
      );

      const board: Board = this.boardRepository.create({
        user,
        ...createBoardDto,
        location: newLocation as DeepPartial<Location>,
      });

      const savedBoard: Board = await queryRunner.manager.save(board);

      // 채팅방 생성 로직을 트랜잭션 내부로 이동
      const chatRoom: ChatRoom =
        await this.chatRoomService.createChatRoomForBoard(
          queryRunner,
          savedBoard,
          createBoardDto.maxCapacity,
          user,
        );

      // Board에 ChatRoom을 연결
      savedBoard.chatRoom = chatRoom;
      await queryRunner.manager.save(savedBoard);

      await queryRunner.commitTransaction();

      this.logger.log(
        `게시판과 채팅방이 생성되었습니다. Board ID: ${savedBoard.id}, ChatRoom ID: ${chatRoom.id}`,
      );

      return this.boardMapper.toBoardResponseDto(savedBoard, user.id, chatRoom);
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
    const skip: number = (page - 1) * limit;

    const [boards, totalCount] = await this.boardRepository.findAndCount({
      relations: ['user', 'location'],
      skip,
      take: limit,
      order: { updatedAt: 'DESC' },
    });

    const totalPage: number = Math.ceil(totalCount / limit);

    const data: BoardResponseDto[] = await Promise.all(
      boards.map(async (board: Board) => {
        const chatRoom: ChatRoom =
          await this.chatRoomService.findChatRoomByBoardId(board.id);
        if (!chatRoom) {
          throw new NotFoundException(
            '게시판에 연결된 채팅방을 찾을 수 없습니다.',
          );
        }

        return this.boardMapper.toBoardResponseDto(board, undefined, chatRoom);
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

    const chatRoom: ChatRoom =
      await this.chatRoomService.findChatRoomByBoardId(id);
    if (!chatRoom) {
      throw new NotFoundException('게시판에 연결된 채팅방을 찾을 수 없습니다.');
    }

    return this.boardMapper.toBoardResponseDto(board, userId, chatRoom);
  }

  async updateBoard(
    id: number,
    userId: number,
    updateBoardDto: UpdateBoardDto,
  ): Promise<BoardResponseDto> {
    const board: Board = await this.boardRepository.findOne({
      where: { id },
      relations: ['user', 'location'],
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    if (board.user.id !== userId) {
      throw new UnauthorizedException(
        '게시글을 수정할 권한이 없습니다. 게시글 작성자만 수정할 수 있습니다.',
      );
    }

    const chatRoom: ChatRoom =
      await this.chatRoomService.findChatRoomByBoardId(id);
    if (!chatRoom) {
      throw new NotFoundException('게시판에 연결된 채팅방을 찾을 수 없습니다.');
    }

    const updatedBoard: Board = await this.boardMapper.updateBoardFromDto(
      board,
      updateBoardDto,
    );
    const savedBoard: Board = await this.boardRepository.save(updatedBoard);

    const updatedChatRoom: ChatRoom = this.chatRoomMapper.updateChatRoomFromDto(
      chatRoom,
      updateBoardDto,
    );
    const savedChatRoom: ChatRoom =
      await this.chatRoomRepository.save(updatedChatRoom);

    return this.boardMapper.toBoardResponseDto(
      savedBoard,
      userId,
      savedChatRoom,
    );
  }

  async removeBoard(id: number, userId: number): Promise<void> {
    const board: Board = await this.boardRepository.findOne({
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
    if (board.chatRoom?.messages) {
      await this.messageRepository.remove(board.chatRoom.messages);
    }

    await this.boardRepository.remove(board);
  }

  private async getOrCreateLocation(
    location: { latitude: number; longitude: number },
    location_name: string,
  ): Promise<Location> {
    let newLocation: Location =
      await this.locationService.findLocationByCoordinates(
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
      newLocation.locationName = location_name;
      await this.locationService.updateLocation(newLocation);
    }

    return newLocation;
  }
}
