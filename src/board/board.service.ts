import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { CreateBoardDto } from './dto/create-board';
import { UserService } from '../user/user.service';
import { LocationService } from '../location/location.service';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    private readonly userService: UserService,
    private readonly locationService: LocationService,
  ) {}

  async createBoard(createBoardDto: CreateBoardDto): Promise<Board> {
    const user = await this.userService.findOne(createBoardDto.user_id);

    const {
      title,
      category,
      description,
      location,
      location_name,
      max_capacity,
      date,
      start_time,
    } = createBoardDto;

    // 먼저 주어진 좌표로 위치를 검색합니다.
    let newLocation = await this.locationService.findLocationByCoordinates(
      location.latitude,
      location.longitude,
    );

    // 해당 좌표에 위치가 없으면 새로운 위치를 생성합니다.
    if (!newLocation) {
      newLocation = await this.locationService.createLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        location_name,
      });
    } else {
      // 기존 위치에 location_name을 업데이트합니다.
      newLocation.location_name = location_name;
      await this.locationService.updateLocation(newLocation);
    }

    const board = this.boardRepository.create({
      user,
      title,
      category,
      description,
      location: newLocation,
      max_capacity,
      date,
      start_time,
    });

    await this.boardRepository.save(board);
    return board;
  }
}
