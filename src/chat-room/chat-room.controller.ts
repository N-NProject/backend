import {
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { BoardIdDto } from './dto/board-id.dto';
import { ChatRoomIdDto } from './dto/chat-room-id.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Token } from '../auth/auth.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

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

  /**
   * 채팅방 나가기
   */
  @ApiBearerAuth()
  @Delete(':chatRoomId/leave')
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
