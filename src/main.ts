import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('YOGIJOGI API')
    .setDescription('YOGIJOGI API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addBearerAuth({ type: 'http', scheme: 'bearer', in: 'header' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  // WebSocket 어댑터 설정
  app.useWebSocketAdapter(new IoAdapter(app));

  // 전역 ValidationPipe 설정
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // 서버 시작
  await app.listen(8000);
}

bootstrap();
