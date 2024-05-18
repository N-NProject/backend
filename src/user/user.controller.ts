import { Body, Controller, Get, Patch, UseGuards, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from './dto/user.dto';
import { User } from './entity/user.entity';
import { AuthGuard } from 'src/auth/auth.guard';
import { Token } from 'src/auth/auth.decorator';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get()
    @UseGuards(AuthGuard)
    getUser(@Token('id') id: number): Promise<User> {
        return this.userService.getUserById(id);
    }

    @Patch()
    @UseGuards(AuthGuard)
    updateUser(@Token('id') id: number, @Body(ValidationPipe) userDto: UserDto): Promise<void> {
        return this.userService.updateUser(id, userDto);
    }
}
