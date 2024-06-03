import { Body, Controller, Delete, Param, Post, Query } from '@nestjs/common';
import { ChatRoomService } from './chat-room.service';
import { ChatRoom } from './entities/chat-room.entity';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { BoardIdDto } from './dto/board-id.dto';
import { UserIdDto } from './dto/user-id.dto';
import { ChatRoomIdDto } from './dto/chat-room-id.dto';

@Controller('api/v1/chatrooms')
export class ChatRoomController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  /**
   * 게시글의 채팅방 접속
   */
  @Post('join')
  async accessChatRoom(
    @Body() createChatRoomDto: CreateChatRoomDto,
    @Query() boardIdDto: BoardIdDto,
    @Query() userIdDto: UserIdDto,
  ): Promise<ChatRoom> {
    const chatRoom = await this.chatRoomService.findOrCreateChatRoom(
      boardIdDto.boardId,
      createChatRoomDto,
    );
    return this.chatRoomService.joinChatRoom(chatRoom.id, userIdDto.userId);
  }

  @Delete(':chatRoomId/leave')
  async leaveChatRoom(
    @Param() chatRoomIdDto: ChatRoomIdDto,
    @Query() userIdDto: UserIdDto,
  ): Promise<void> {
    return this.chatRoomService.leaveChatRoom(
      chatRoomIdDto.chatRoomId,
      userIdDto.userId,
    );
  }
}
