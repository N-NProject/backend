import {
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
  Logger,
  Get,
  Body,
} from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { BoardIdDto } from './dto/board-id.dto';
import { ChatRoomIdDto } from './dto/chat-room-id.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Token } from '../auth/auth.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateMessageDto } from '../message/dto/create-message.dto';

@ApiTags('Chat-rooms')
@Controller('api/v1/chatrooms')
@UseGuards(AuthGuard)
export class ChatRoomController {
  private readonly logger = new Logger(ChatRoomController.name);

  constructor(private readonly chatRoomService: ChatRoomService) {}

  /**
   * 게시글의 채팅방 접속
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글의 채팅방 접속' })
  @Post('join')
  @HttpCode(200)
  async accessChatRoom(
    @Token('sub') id: number,
    @Query() boardIdDto: BoardIdDto,
  ) {
    this.logger.log(
      `User ${id} is joining chat room for board ${boardIdDto.boardId}`,
    );
    const chatRoom = await this.chatRoomService.findOrCreateChatRoom(
      boardIdDto.boardId,
    );
    return this.chatRoomService.joinChatRoom(chatRoom.id, id);
  }

  //메세지 조회
  @ApiBearerAuth()
  @Get(':chatRoomId/messages')
  @ApiOperation({ summary: '메세지 조회' })
  @HttpCode(200)
  async getMessages(
    @Token('sub') id: number,
    @Param('chatRoomId') chatRoomId: number,
  ) {
    this.logger.log(`유저 ${id}가 채팅방 ${chatRoomId}에 메시지 조회합니다.`);
    return this.chatRoomService.getMessages(chatRoomId);
  }

  //메세지 전송
  @ApiBearerAuth()
  @Post(':chatRoomId/messages')
  @ApiOperation({ summary: '메세지 전송' })
  @ApiBody({ type: CreateMessageDto })
  @HttpCode(200)
  async sendMessage(
    @Token('sub') id: number,
    @Param('chatRoomId') chatRoomId: number,
    @Body() message: { content: string },
  ) {
    this.logger.log(
      `유저 ${id}가 채팅방 ${chatRoomId}에 메세지 전송: ${message.content}`,
    );
    return this.chatRoomService.sendMessage(chatRoomId, id, message.content);
  }

  //채팅방 목록 조회
  @ApiBearerAuth()
  @Get('rooms')
  @ApiOperation({ summary: '채팅방 목록 조회' })
  @HttpCode(200)
  async getChatRooms(@Token('sub') id: number) {
    this.logger.log(`유저 ${id}가 채팅방 목록을 조회합니다.`);
    return this.chatRoomService.getChatRooms();
  }

  //특정 채팅방 조회
  @ApiBearerAuth()
  @Get(':chatRoomId')
  @ApiOperation({ summary: '특정 채팅방 조회' })
  @HttpCode(200)
  async getChatRoom(
    @Token('sub') id: number,
    @Param('chatRoomId') chatRoomId: number,
  ) {
    this.logger.log(`유저 ${id}가 채팅방 ${chatRoomId}를 조회합니다`);
    return this.chatRoomService.getChatRoom(chatRoomId);
  }

  /**
   * 채팅방 나가기
   */
  @ApiBearerAuth()
  @Delete(':chatRoomId/leave')
  @ApiOperation({ summary: '채팅방 나가기' })
  @HttpCode(204)
  async leaveChatRoom(
    @Token('sub') id: number,
    @Param() chatRoomIdDto: ChatRoomIdDto,
  ): Promise<void> {
    this.logger.log(
      `User ${id} is leaving chat room ${chatRoomIdDto.chatRoomId}`,
    );
    return this.chatRoomService.leaveChatRoom(chatRoomIdDto.chatRoomId, id);
  }
}
