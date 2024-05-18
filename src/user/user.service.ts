import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDto } from './dto/user.dto';

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

    async getUserById(id: number): Promise<User> {
        const found = await this.userRepository.findOneBy({ id });

        if (!found) {
            throw new NotFoundException(`Can't find Board with id ${id}`);
        }

        return found;
    }

    async updateUser(id: number, userDto: UserDto): Promise<void> {
        const user = await this.getUserById(id);

        Object.assign(user, userDto);

        this.userRepository.save(user);
    }

    async deleteUser(id: number): Promise<void> {
        this.userRepository.softDelete(id);
    }
}
