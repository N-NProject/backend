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
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PagingParams } from '../global/common/type';
import { UserChatRoomResponseDto } from './dto/user-chat-room.response.dto';

@ApiTags('Users')
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: '유저가 생성한 게시글, 유저가 참여한 게시글 조회' })
  @ApiCookieAuth()
  @ApiQuery({
    name: 'createdBeforeCursor',
    required: false,
    type: String,
    description: '생성한 게시글 목록의 이전 커서 값',
  })
  @ApiQuery({
    name: 'createdAfterCursor',
    required: false,
    type: String,
    description: '생성한 게시글 목록의 다음 커서 값',
  })
  @ApiQuery({
    name: 'joinedBeforeCursor',
    required: false,
    type: String,
    description: '참여한 게시글 목록의 이전 커서 값',
  })
  @ApiQuery({
    name: 'joinedAfterCursor',
    required: false,
    type: String,
    description: '참여한 게시글 목록의 다음 커서 값',
  })
  @Get()
  @UseGuards(AuthGuard)
  getUser(
    @Token('sub') id: number,
    @Query('createdBeforeCursor') createdBeforeCursor?: string,
    @Query('createdAfterCursor') createdAfterCursor?: string,
    @Query('joinedBeforeCursor') joinedBeforeCursor?: string,
    @Query('joinedAfterCursor') joinedAfterCursor?: string,
  ): Promise<UserResponseDto> {
    const createdBoardsPagingParams: PagingParams = {
      beforeCursor: createdBeforeCursor,
      afterCursor: createdAfterCursor,
    };

    const joinedBoardsPagingParams: PagingParams = {
      beforeCursor: joinedBeforeCursor,
      afterCursor: joinedAfterCursor,
    };

    return this.userService.getUserById(
      id,
      createdBoardsPagingParams,
      joinedBoardsPagingParams,
    );
  }

  @ApiCookieAuth()
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
  @ApiOperation({ summary: '유저가 참여한 채팅방' })
  @ApiQuery({
    name: 'beforeCursor',
    required: false,
    type: String,
    description: '이전 커서 값',
  })
  @ApiQuery({
    name: 'afterCursor',
    required: false,
    type: String,
    description: '다음 커서 값',
  })
  @ApiCookieAuth()
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
