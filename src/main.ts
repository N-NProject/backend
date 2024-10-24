import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io'; // Import the Socket.IO adapter
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // Express 기반의 애플리케이션 생성
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('YOGIJOGI API')
    .setDescription('YOGIJOGI API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  // CORS 설정 추가
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });

  // Socket.IO 어댑터 설정
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // 정적 파일 제공 설정
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // cookieParser 설정
  app.use(cookieParser());

  // 메인 서버 시작
  await app.listen(8000);

  const logger = new Logger('Bootstrap');
  logger.log('Main server running on http://localhost:8000');
}

bootstrap();
