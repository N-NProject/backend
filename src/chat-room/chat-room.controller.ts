import {
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { BoardIdDto } from './dto/board-id.dto';
import { ChatRoomIdDto } from './dto/chat-room-id.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Token } from '../auth/auth.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Chat-rooms')
@Controller('api/v1/chatrooms')
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  /**
   * 게시글의 채팅방 접속
   */
  @ApiBearerAuth()
  @Post('join')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async accessChatRoom(
    @Token('sub') id: number,
    @Query() boardIdDto: BoardIdDto,
  ) {
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
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async leaveChatRoom(
    @Token('sub') id: number,
    @Param() chatRoomIdDto: ChatRoomIdDto,
  ): Promise<void> {
    return this.chatRoomService.leaveChatRoom(chatRoomIdDto.chatRoomId, id);
  }
}
