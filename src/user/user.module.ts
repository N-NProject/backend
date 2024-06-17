import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserChatRoom } from 'src/user-chat-room/entities/user-chat-room.entity';
import { ChatRoom } from 'src/chat-room/entities/chat-room.entity';
import { Board } from 'src/board/entities/board.entity';
import { CustomUserChatRoomRepository } from '../user-chat-room/repository/user-chat-room.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserChatRoom, ChatRoom, Board])],
  controllers: [UserController],
  providers: [UserService, CustomUserChatRoomRepository],
  exports: [UserService],
})
export class UserModule {}
