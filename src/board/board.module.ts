import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { Board } from './entities/board.entity';
import { UserModule } from '../user/user.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [TypeOrmModule.forFeature([Board]), UserModule, LocationModule],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardsModule {}
