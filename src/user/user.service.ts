import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDto } from './dto/user.dto';
import { UserResponseDto } from './dto/user.response.dto';
import { CustomUserChatRoomRepository } from '../user-chat-room/repository/user-chat-room.repository';
import { PagingParams } from '../global/common/type';
import { CustomBoardRepository } from '../board/repository/board.repository';
import { Board } from '../board/entities/board.entity';
import { ChatRoom } from '../chat-room/entities/chat-room.entity';
import { ChatRoomService } from '../chat-room/chat-room.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly customUserChatRoomRepository: CustomUserChatRoomRepository,
    private readonly customBoardRepository: CustomBoardRepository,
    private readonly chatRoomService: ChatRoomService,
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
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userChatRooms.chatRoom', 'userChatRooms.chatRoom.board'],
    });

    if (!user) {
      throw new NotFoundException(`${userId}번 유저를 찾을 수 없습니다.`);
    }

    const paginationResult = await this.customUserChatRoomRepository.paginate(
      userId,
      pagingParams,
    );

    const chatRoomsWithBoards = await Promise.all(
      paginationResult.data.map(async (userChatRoom) => {
        const chatRoom: ChatRoom | null = userChatRoom.chatRoom;
        const board: Board | null = chatRoom?.board;

        // chatRoom 또는 board가 null일 경우 필터링
        if (!chatRoom || !board) {
          console.log(
            `ChatRoom or Board is undefined or null for userChatRoomId: ${userChatRoom.id}`,
          );
          return null; // null인 데이터를 건너뛰기
        }

        return {
          id: chatRoom.id,
          board: {
            boardId: board.id,
            title: board.title,
            currentPerson: chatRoom.member_count,
            maxCapacity: board.max_capacity,
            description: board.description,
            startTime: board.start_time,
            category: board.category,
            location: {
              id: board.location?.id || 0,
              latitude: board.location?.latitude || 0,
              longitude: board.location?.longitude || 0,
              locationName: board.location?.location_name || 'Unknown location',
            },
            date: board.date,
            status: new Date(board.date) > new Date() ? 'OPEN' : 'CLOSED',
            createdAt: board.createdAt,
            updatedAt: board.updatedAt,
            deletedAt: board.deletedAt,
          },
        };
      }),
    );

    // null이 아닌 결과만 필터링
    const filteredChatRooms = chatRoomsWithBoards.filter(
      (room) => room !== null,
    );

    return {
      chatRooms: filteredChatRooms,
      cursor: paginationResult.cursor,
    };
  }
}
