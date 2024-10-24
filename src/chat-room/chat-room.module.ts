import { forwardRef, Module } from '@nestjs/common';
import { ChatRoomController } from './chat-room.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatRoomService } from './chat-room.service';
import { UserChatRoom } from '../user-chat-room/entities/user-chat-room.entity';
import { User } from '../user/entities/user.entity';
import { EventsModule } from '../events/evnets.module';
import { MessageModule } from '../message/message.module';
import { Board } from '../board/entities/board.entity';
import { UserModule } from '../user/user.module';
import { BoardsModule } from '../board/board.module';
import { SseModule } from '../sse/sse.module';
import { ChatRoomMapper } from './dto/chat-room.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, UserChatRoom, User, Board]),
    MessageModule,
    forwardRef(() => BoardsModule),
    forwardRef(() => EventsModule),
    forwardRef(() => UserModule),
    forwardRef(() => SseModule),
  ],
  controllers: [ChatRoomController],
  providers: [ChatRoomService, ChatRoomMapper],
  exports: [ChatRoomService, TypeOrmModule, ChatRoomMapper],
})
export class ChatRoomModule {}
