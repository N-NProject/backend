import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { CreateBoardDto } from './dto/create-board';
import { UpdateBoardDto } from './dto/update-board';
import { UserService } from '../user/user.service';
import { LocationService } from '../location/location.service';
import { ChatRoomService } from '../chat-room/chat-room.service';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    private readonly userService: UserService,
    private readonly locationService: LocationService,
    private readonly chatRoomService: ChatRoomService,
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
    await this.chatRoomService.findOrCreateChatRoom(board.id);

    return board;
  }

  async findAll(): Promise<Board[]> {
    return this.boardRepository.find({ relations: ['user', 'location'] });
  }

  async findOne(id: number): Promise<Board> {
    const board = await this.boardRepository.findOne({
      where: { id },
      relations: ['user', 'location'],
    });
    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }
    return board;
  }

  async updateBoard(
    id: number,
    updateBoardDto: UpdateBoardDto,
  ): Promise<Board> {
    const board = await this.findOne(id);

    const updatedLocation = await this.locationService.updateLocation({
      ...board.location,
      ...updateBoardDto.location,
      location_name: updateBoardDto.location_name,
    });

    const updatedBoard = this.boardRepository.merge(board, updateBoardDto, {
      location: updatedLocation,
    });

    return this.boardRepository.save(updatedBoard);
  }

  async removeBoard(id: number): Promise<void> {
    const board = await this.findOne(id);
    await this.boardRepository.remove(board);
  }
}
