import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { EventsGateway } from './evnets/events.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('YOGIJOGI API')
    .setDescription('YOGIJOGI API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  // WebSocket 어댑터 설정
  const wsApp = await NestFactory.create(AppModule);
  wsApp.useWebSocketAdapter(new WsAdapter(wsApp));
  wsApp.useGlobalPipes(new ValidationPipe({ transform: true }));

  // 메인 서버와 WebSocket 서버 각각 시작
  await app.listen(8000); // 메인 서버 포트
  await wsApp.listen(3000); // WebSocket 서버 포트

  const logger = new Logger('Bootstrap');
  logger.log('Main server running on http://localhost:8000');
  logger.log('WebSocket server running on ws://localhost:3000');
}

bootstrap();
