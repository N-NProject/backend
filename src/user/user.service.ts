import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDto } from './dto/user.dto';
import { UserResponseDto } from './dto/user.response.dto';
import { CustomUserChatRoomRepository } from '../user-chat-room/repository/user-chat-room.repository';
import { PagingParams } from '../global/common/type';
import { CustomBoardRepository } from '../board/repository/board.repository';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly customUserChatRoomRepository: CustomUserChatRoomRepository,
    private readonly customBoardRepository: CustomBoardRepository,
  ) {}

  async getUserByKakaoId(kakaoId: number): Promise<User> {
    return this.userRepository.findOneBy({ kakaoId });
  }

  async createUserWithKakaoIdAndUsername(
    kakaoId: number,
    username: string,
  ): Promise<User> {
    const user = this.userRepository.create({ kakaoId, username });
    return this.userRepository.save(user);
  }

  /** 유저 정보 조회(작성한 게시글 포함) */
  async getUserById(
    id: number,
    createdBoardsPagingParams: PagingParams,
    joinedBoardsPagingParams: PagingParams,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['boards', 'userChatRooms'],
    });

    if (!user) {
      throw new NotFoundException(`Can't find User with id ${id}`);
    }

    const createdBoardsPagination =
      await this.customBoardRepository.paginateCreatedBoards(
        id,
        createdBoardsPagingParams,
      );

    const userChatRoomIds = user.userChatRooms.map(
      (userChatRoom) => userChatRoom.id,
    );

    const chatroomIds =
      await this.customUserChatRoomRepository.getChatRoomIds(userChatRoomIds);

    const joinedBoardsPagination =
      await this.customBoardRepository.paginateJoinedBoards(
        id,
        chatroomIds,
        joinedBoardsPagingParams,
      );

    return {
      username: user.username,
      region: user.region,
      createdBoards: {
        data: createdBoardsPagination.data,
        cursor: createdBoardsPagination.cursor,
      },
      joinedBoards: {
        data: joinedBoardsPagination.data,
        cursor: joinedBoardsPagination.cursor,
      },
    };
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
