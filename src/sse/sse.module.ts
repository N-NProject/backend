import { Module } from '@nestjs/common';
import { SseController } from './sse.controller';
import { BoardService } from '../board/board.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../board/entities/board.entity';
import { LocationService } from '../location/location.service';
import { ChatRoomService } from '../chat-room/chat-room.service';
import { UserModule } from '../user/user.module';
import { LocationModule } from '../location/location.module';
import { ChatRoomModule } from '../chat-room/chat-room.module';
import { BoardsModule } from '../board/board.module';
import { EventsModule } from '../events/evnets.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board]),
    UserModule,
    LocationModule,
    ChatRoomModule,
    BoardsModule,
    EventsModule,
    MessageModule,
  ],
  controllers: [SseController],
  providers: [BoardService, LocationService, ChatRoomService],
})
export class SseModule {}
