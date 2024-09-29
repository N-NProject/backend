import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './global/config/typeorm.config';
import { BoardsModule } from './board/board.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { LocationModule } from './location/location.module';
import { ChatRoomModule } from './chat-room/chat-room.module';
import { SseController } from './sse/sse.controller';
import { SseModule } from './sse/sse.module';
import { EventsModule } from './events/evnets.module';
import { MessageService } from './message/message.service';
import { MessageModule } from './message/message.module';
import { LoggerMiddleware } from './global/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    AuthModule,
    BoardsModule,
    ChatRoomModule,
    EventsModule,
    LocationModule,
    MessageModule,
    SseModule,
    UserModule,
  ],
  controllers: [SseController],
  providers: [MessageService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
