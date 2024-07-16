import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserChatRoom } from 'src/user-chat-room/entities/user-chat-room.entity';
import { Board } from 'src/board/entities/board.entity';
import { CustomUserChatRoomRepository } from '../user-chat-room/repository/user-chat-room.repository';
import { CustomBoardRepository } from '../board/repository/board.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserChatRoom, Board])],
  controllers: [UserController],
  providers: [UserService, CustomUserChatRoomRepository, CustomBoardRepository],
  exports: [UserService],
})
export class UserModule {}
