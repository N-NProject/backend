import {
  Injectable,
  Logger,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './config/typeorm.config';
import { BoardsModule } from './board/board.module';
import { getEnvPath } from './global/common/helper/env.helper';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { LocationModule } from './location/location.module';
import { ChatRoomModule } from './chat-room/chat-room.module';
import { SseController } from './sse/sse.controller';
import { SseModule } from './sse/sse.module';
import { EventsModule } from './events/evnets.module';
import { MessageService } from './message/message.service';
import { MessageModule } from './message/message.module';

const envFilePath: string = getEnvPath('./');

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    res.on('finish', () => {
      const { statusCode } = res;
      this.logger.log(
        `${method} ${statusCode} - ${originalUrl} - ${userAgent}`,
      );
    });
    next();
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    BoardsModule,
    UserModule,
    AuthModule,
    LocationModule,
    ChatRoomModule,
    SseModule,
    EventsModule,
    MessageModule,
  ],
  controllers: [SseController],
  providers: [MessageService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
