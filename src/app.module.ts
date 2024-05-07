import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmConfigService } from './database/typeorm.config';
import { BoardsModule } from './board/board.module';
import { getEnvPath } from './global/common/helper/env.helper';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';

const envFilePath: string = getEnvPath(`${__dirname}/common/envs`);

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
    UserModule, // 이제 UserModule도 추가합니다.
  ],
  controllers: [AppController], // UserController는 UserModule 내부에서 처리합니다.
  providers: [AppService], // UserService는 UserModule 내부에서 처리합니다.
})
export class AppModule {}
