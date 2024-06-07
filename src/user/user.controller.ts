import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from './dto/user.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { Token } from 'src/auth/auth.decorator';
import { UserResponseDto } from './dto/user.response.dto';

@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard)
  getUser(@Token('id') id: number): Promise<UserResponseDto> {
    return this.userService.getUserById(id);
  }

  @Patch()
  @HttpCode(204)
  @UseGuards(AuthGuard)
  updateUser(
    @Token('id') id: number,
    @Body(ValidationPipe) userDto: UserDto,
  ): void {
    this.userService.updateUser(id, userDto);
  }
}
