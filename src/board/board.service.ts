import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { CreateBoardDto } from './dto/create-board';
import { User } from '../user/entities/user.entity';
import { Location } from '../location/entities/location.entity';
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
    const location = await this.locationService.findOne(
      createBoardDto.location_id,
    );

    const {
      title,
      category,
      description,
      max_capacity,
      date,
      start_time,
      end_time,
    } = createBoardDto;

    const board = this.boardRepository.create({
      user,
      title,
      category,
      description,
      max_capacity,
      date,
      start_time,
      end_time,
      location,
    } as Partial<Board>);

    await this.boardRepository.save(board);
    return board;
  }
}
