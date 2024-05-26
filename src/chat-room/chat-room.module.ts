import { Module } from '@nestjs/common';
import { ChatRoomController } from './chat-room.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { Board } from '../board/entities/board.entity';
import { ChatRoomService } from './chat-room.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatRoom, Board])],
  providers: [ChatRoomService],
  controllers: [ChatRoomController],
  exports: [ChatRoomService],
})
export class ChatRoomModule {}
