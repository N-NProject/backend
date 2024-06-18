import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDto } from './dto/user.dto';
import { UserResponseDto } from './dto/user.response.dto';
import { Board } from 'src/board/entities/board.entity';
import { UserChatRoom } from 'src/user-chat-room/entities/user-chat-room.entity';
import { CustomUserChatRoomRepository } from '../user-chat-room/repository/user-chat-room.repository';
import { PagingParams } from '../global/common/type';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserChatRoom)
    private readonly userChatRoomRepository: Repository<UserChatRoom>,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    private readonly customUserChatRoomRepository: CustomUserChatRoomRepository,
  ) {}

  async getUserByKakaoId(kakaoId: number): Promise<User> {
    return this.userRepository.findOneBy({ kakaoId });
  }

  async createUserWithKakaoId(kakaoId: number): Promise<User> {
    const user = this.userRepository.create({ kakaoId });
    return this.userRepository.save(user);
  }

  async getUserById(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['boards', 'userChatRooms'],
    });

    if (!user) {
      throw new NotFoundException(`Can't find Board with id ${id}`);
    }

    const createdBoards = user.boards;

    const userChatRoomIds = user.userChatRooms.map(
      (userChatRoom) => userChatRoom.id,
    );

    const chatRooms = await this.userChatRoomRepository
      .createQueryBuilder('ucr')
      .select('ucr.chat_room_id')
      .where('ucr.id IN (:...userChatRoomIds)', { userChatRoomIds })
      .getRawMany();

    const chatroomIds = chatRooms.map((chatRoom) => chatRoom.chat_room_id);

    const boards = await this.boardRepository.find({
      where: { chat_room: In(chatroomIds) },
    });

    const createdBoardIds = createdBoards.map(
      (createdBoard) => createdBoard.id,
    );

    const joinedBoards = boards.filter(
      (board) => !createdBoardIds.includes(board.id),
    );

    const userResponseDto: UserResponseDto = {
      username: user.username,
      region: user.region,
      createdBoards,
      joinedBoards,
    };
    return userResponseDto;
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOneOrFail({ where: { id } });
  }

  async updateUser(id: number, userDto: UserDto): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException(`Can't find Board with id ${id}`);
    }

    Object.assign(user, userDto);

    this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    this.userRepository.softDelete(id);
  }

  /** 유저가 참여한 채팅방 **/
  async getUserChatRooms(
    userId: number,
    pagingParams?: PagingParams,
  ): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`${userId}번 유저를 찾을 수 없습니다.`);
    }

    const paginationResult = await this.customUserChatRoomRepository.paginate(
      userId,
      pagingParams,
    );

    const chatRoomsWithBoards = paginationResult.data
      .map((userChatRoom) => {
        const chatRoom = userChatRoom.chatRoom;
        const board = chatRoom?.board;
        return {
          id: chatRoom.id,
          board: {
            createdAt: board?.createdAt,
            updatedAt: board?.updatedAt,
            deletedAt: board?.deletedAt,
            boardId: board?.id,
            title: board?.title,
            max_capacity: board?.max_capacity,
            description: board?.description,
            start_time: board?.start_time,
            category: board?.category,
            date: board?.date,
          },
        };
      })
      .filter((item) => item.board.boardId !== undefined); // Filter out undefined boards

    return {
      chatRooms: chatRoomsWithBoards,
      cursor: paginationResult.cursor,
    };
  }
}
