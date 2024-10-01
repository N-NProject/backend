import { forwardRef, Module } from '@nestjs/common';
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
import { SseService } from './sse.service';
import { BoardMapper } from '../board/dto/board.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board]),
    forwardRef(() => ChatRoomModule),
    forwardRef(() => UserModule),
    forwardRef(() => BoardsModule),
    forwardRef(() => EventsModule),
    MessageModule,
    LocationModule,
  ],
  controllers: [SseController],
  exports: [SseService],
  providers: [
    BoardService,
    LocationService,
    ChatRoomService,
    SseService,
    BoardMapper,
  ],
})
export class SseModule {}
