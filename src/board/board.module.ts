import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { Board } from './entities/board.entity';
import { UserModule } from '../user/user.module';
import { LocationModule } from '../location/location.module';
import { ChatRoomModule } from '../chat-room/chat-room.module';
import { Message } from '../message/entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board, Message]), // Message 엔터티 추가
    UserModule,
    LocationModule,
    ChatRoomModule,
  ],
  controllers: [BoardController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardsModule {}
