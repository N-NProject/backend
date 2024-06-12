import { Module } from '@nestjs/common';
import { ChatRoomController } from './chat-room.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { Board } from '../board/entities/board.entity';
import { ChatRoomService } from './chat-room.service';
import { UserChatRoom } from '../user-chat-room/entities/user-chat-room.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatRoom, UserChatRoom, Board, User])],
  providers: [ChatRoomService],
  exports: [ChatRoomService, TypeOrmModule],
})
export class ChatRoomModule {}
