import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from './dto/user.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { Token } from 'src/auth/auth.decorator';
import { UserResponseDto } from './dto/user.response.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PagingParams } from '../global/common/type';
import { UserChatRoomResponseDto } from './dto/user-chat-room.response.dto';


@ApiTags('Users')
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @Get()
  @UseGuards(AuthGuard)
  getUser(@Token('sub') id: number): Promise<UserResponseDto> {
    return this.userService.getUserById(id);
  }

  @ApiBearerAuth()
  @Patch()
  @HttpCode(204)
  @UseGuards(AuthGuard)
  updateUser(
    @Token('sub') id: number,
    @Body(ValidationPipe) userDto: UserDto,
  ): void {
    this.userService.updateUser(id, userDto);
  }

  /** 유저가 참여한 채팅방 반환 */
  @ApiBearerAuth()
  @Get('chatrooms')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async getUserChatRooms(
    @Token('sub') id: number,
    @Query() pagingParams: PagingParams,
  ): Promise<UserChatRoomResponseDto> {
    return this.userService.getUserChatRooms(id, pagingParams);
  }
}
