import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BoardModule } from './board/board.module';
import { UserModule } from './user/user.module';
import { Board } from './board/entities/board.entity';
import { User } from './user/entities/user.entitiy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [User, Board], // 엔티티 등록
      synchronize: true, // 개발 중에는 true로 설정, 프로덕션에서는 false 권장
    }),
    BoardModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
