import { Injectable } from '@nestjs/common';
import { Board } from '../entities/board.entity';
import { BoardResponseDto } from './board-response.dto';
import { UpdateBoardDto } from './update-board';
import { LocationService } from '../../location/location.service';
import { ChatRoom } from '../../chat-room/entities/chat-room.entity';

@Injectable()
export class BoardMapper {
  constructor(private readonly locationService: LocationService) {}

  toBoardResponseDto(
    board: Board,
    userId: number | undefined,
    chatRoom: ChatRoom,
  ): BoardResponseDto {
    const {
      id,
      title,
      description,
      startTime,
      date,
      category,
      createdAt,
      updatedAt,
      deletedAt,
      user,
      location,
    } = board;
    const status = new Date(board.date) > new Date() ? 'OPEN' : 'CLOSE';

    return {
      id,
      title,
      maxCapacity: chatRoom.maxMemberCount,
      currentPerson: chatRoom.memberCount,
      description,
      startTime: startTime,
      date,
      category,
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.locationName,
      },
      createdAt,
      updatedAt,
      deletedAt,
      status,
      user: user ? { userId: user.id, username: user.username } : undefined,
      editable: userId === user.id,
    };
  }

  async updateBoardFromDto(
    board: Board,
    updateBoardDto: Partial<UpdateBoardDto>,
  ): Promise<Board> {
    if (updateBoardDto.location || updateBoardDto.locationName) {
      board.location = await this.locationService.updateLocation({
        ...board.location,
        ...updateBoardDto.location,
        locationName:
          updateBoardDto.locationName || board.location.locationName,
      });
    }

    if (updateBoardDto.title !== undefined) board.title = updateBoardDto.title;
    if (updateBoardDto.category !== undefined)
      board.category = updateBoardDto.category;
    if (updateBoardDto.description !== undefined)
      board.description = updateBoardDto.description;
    if (updateBoardDto.date !== undefined) board.date = updateBoardDto.date;
    if (updateBoardDto.startTime !== undefined)
      board.startTime = updateBoardDto.startTime;

    return board;
  }

  async mapBoardToBoardResponseDto(
    board: Board,
    chatRoom: ChatRoom,
  ): Promise<BoardResponseDto | null> {
    if (!chatRoom || !board) {
      console.log(
        `채팅방 또는 게시글을 찾을 수 없습니다. boardId: ${board?.id}, chatRoomId: ${chatRoom?.id}`,
      );
      return null;
    }

    return {
      id: board.id,
      title: board.title,
      currentPerson: chatRoom.memberCount,
      maxCapacity: chatRoom.maxMemberCount,
      description: board.description,
      startTime: board.startTime,
      category: board.category,
      location: {
        id: board.location?.id || 0,
        latitude: board.location?.latitude || 0,
        longitude: board.location?.longitude || 0,
        locationName: board.location?.locationName || 'Unknown location',
      },
      date: board.date,
      status: new Date(board.date) > new Date() ? 'OPEN' : 'CLOSED',
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      deletedAt: board.deletedAt,
    };
  }
}
