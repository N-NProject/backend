import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmConfigService } from './config/typeorm.config';
import { BoardsModule } from './board/board.module';
import { getEnvPath } from './global/common/helper/env.helper';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { LocationService } from './location/location.service';
import { LocationModule } from './location/location.module';

const envFilePath: string = getEnvPath('./');

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
