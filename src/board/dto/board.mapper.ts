import { Injectable } from '@nestjs/common';
import { Board } from '../entities/board.entity';
import { BoardResponseDto } from './board-response.dto';
import { UpdateBoardDto } from './update-board';
import { LocationService } from '../../location/location.service';

@Injectable()
export class BoardMapper {
  constructor(private readonly locationService: LocationService) {}

  toBoardResponseDto(
    board: Board,
    userId: number | undefined,
    currentPerson: number,
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
      user: user ? { userId: user.id, username: user.username } : undefined,
    };

    // userId가 있는 경우에만 editable을 추가
    if (userId !== undefined) {
      response.editable = user.id === userId;
    }

    return response;
  }

  async updateBoardFromDto(
    board: Board,
    updateBoardDto: Partial<UpdateBoardDto>,
  ): Promise<Board> {
    if (updateBoardDto.location || updateBoardDto.locationName) {
      board.location = await this.locationService.updateLocation({
        ...board.location,
        ...updateBoardDto.location,
        location_name:
          updateBoardDto.locationName || board.location.location_name,
      });
    }

    if (updateBoardDto.title !== undefined) board.title = updateBoardDto.title;
    if (updateBoardDto.category !== undefined)
      board.category = updateBoardDto.category;
    if (updateBoardDto.description !== undefined)
      board.description = updateBoardDto.description;
    if (updateBoardDto.maxCapacity !== undefined)
      board.max_capacity = updateBoardDto.maxCapacity;
    if (updateBoardDto.date !== undefined) board.date = updateBoardDto.date;
    if (updateBoardDto.startTime !== undefined)
      board.start_time = updateBoardDto.startTime;

    return board;
  }
}
