import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDto } from './dto/user.dto';
import { UserResponseDto } from './dto/user.response.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

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
            relations: ['boards'],
        });

        if (!user) {
            throw new NotFoundException(`Can't find Board with id ${id}`);
        }

        const createdBoards = user.boards.filter(board => board.user.id === id);
        const joinedBoards = user.boards.filter(board => board.user.id !== id);

        const userResponseDto: UserResponseDto = {
            username: user.username,
            region: user.region,
            createdBoards,
            joinedBoards
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
}
