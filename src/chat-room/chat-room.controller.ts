import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
  Logger,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { AuthGuard } from '../auth/auth.guard';
import { Token } from '../auth/auth.decorator';
import { ApiCookieAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { UserService } from '../user/user.service';
import { BoardIdDto } from './dto/board-id.dto';

@ApiTags('Chat-rooms')
@Controller('api/v1/chatrooms')
@UseGuards(AuthGuard)
export class ChatRoomController {
  private readonly logger = new Logger(ChatRoomController.name);

  constructor(
    private readonly chatRoomService: ChatRoomService,
    private readonly userService: UserService,
  ) {}

  /**
   * 게시글의 채팅방 접속
   */
  @ApiCookieAuth()
  @ApiOperation({ summary: '게시글의 채팅방 접속' })
  @Post('join/:boardId')
  @HttpCode(200)
  async accessChatRoom(
    @Token('sub') id: number,
    @Param() boardIdDto: BoardIdDto,
  ) {
    const { boardId } = boardIdDto;

    this.logger.log(`User ${id} is joining chat room for board ${boardId}`);

    const chatRoomId = await this.chatRoomService.joinChatRoomByBoardId(
      boardId,
      id,
    );

    return { chatRoomId };
  }

  //메세지 전송
  @ApiCookieAuth()
  @Post(':chatRoomId/messages')
  @ApiOperation({ summary: '메세지 전송' })
  @ApiBody({ type: CreateMessageDto })
  async sendMessage(
    @Token('sub') userId: number,
    @Param('chatRoomId') chatRoomId: number,
    @Body() message: { content: string },
  ) {
    const user = await this.chatRoomService.getUser(userId);
    const username = user ? user.username : 'Unknown';

    this.logger.log(
      `유저 ${userId} (${username})가 채팅방 ${chatRoomId}에 메세지 전송: ${message.content}`,
    );
    return this.chatRoomService.sendMessage(
      chatRoomId,
      userId,
      message.content,
      username,
    );
  }

  //채팅방 목록 조회
  @ApiCookieAuth()
  @Get('rooms')
  @ApiOperation({ summary: '채팅방 목록 조회' })
  @HttpCode(200)
  async getChatRooms(@Token('sub') id: number) {
    this.logger.log(`유저 ${id}가 채팅방 목록을 조회합니다.`);
    return this.chatRoomService.getChatRooms();
  }

  // 특정 채팅방 조회
  @ApiCookieAuth()
  @Get(':chatRoomId')
  @ApiOperation({ summary: '특정 채팅방 조회' })
  @HttpCode(200)
  async getChatRoom(
    @Token('sub') id: number,
    @Param('chatRoomId', ParseIntPipe) chatRoomId: number,
  ) {
    this.logger.log(`유저 ${id}가 채팅방 ${chatRoomId}를 조회합니다`);
    const chatRoom = await this.chatRoomService.getChatRoom(chatRoomId);
    const user = await this.userService.findOne(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }
    const messagesWithNickname = chatRoom.messages.map((message) => ({
      ...message,
    }));
    return {
      ...chatRoom,
      messages: messagesWithNickname,
    };
  }

  /**
   * 채팅방 나가기
   */
  @ApiCookieAuth()
  @ApiOperation({ summary: '채팅방 나가기' })
  @Delete(':boardId/leave')
  @HttpCode(200)
  async leaveChatRoom(
    @Token('sub') id: number,
    @Param() boardIdDto: BoardIdDto,
  ) {
    const { boardId } = boardIdDto;

    this.logger.log(
      `User ${id} is leaving chat room associated with board ${boardId}`,
    );

    const chatRoomId = await this.chatRoomService.leaveChatRoomByBoardId(
      boardId,
      id,
    );

    return { chatRoomId };
  }
}
