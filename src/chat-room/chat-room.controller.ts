import { Body, Controller, Param, Post } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { ChatRoom } from './entities/chat-room.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { BoardIdDto } from './dto/board-id.dto';
import { UserIdDto } from './dto/user-id.dto';

@Controller('api/v1/chatrooms')
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  /**
   * FIXME : endpoint 변경
   */
  @Post('join/:boardId/:userId')
  async accessChatRoom(
    @Param() boardIdDto: BoardIdDto,
    @Param('userId') userIdDto: UserIdDto,
    @Body() createChatRoomDto: CreateChatRoomDto,
  ): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomService.findOrCreateChatRoom(
      boardIdDto.boardId,
      createChatRoomDto,
    );
    return this.chatRoomService.joinChatRoom(chatRoom.id, userIdDto.userId);
  }
}
