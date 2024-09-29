import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { Board } from './entities/board.entity';
import { UserModule } from '../user/user.module';
import { LocationModule } from '../location/location.module';
import { ChatRoomModule } from '../chat-room/chat-room.module';
import { Message } from '../message/entities/message.entity';
import { BoardMapper } from './dto/board.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board, Message]),
    UserModule,
    LocationModule,
    forwardRef(() => ChatRoomModule),
  ],
  controllers: [BoardController],
  providers: [BoardService, BoardMapper],
  exports: [BoardService],
})
export class BoardsModule {}
