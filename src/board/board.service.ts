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
      coordinate,
      location_name,
      max_capacity,
      date,
      start_time,
    } = createBoardDto;

    const location = await this.locationService.createLocation({
      coordinate,
      location_name,
    });

    const board = this.boardRepository.create({
      user,
      title,
      category,
      description,
      location,
      max_capacity,
      date,
      start_time,
    } as Partial<Board>);

    await this.boardRepository.save(board);
    return board;
  }
}
