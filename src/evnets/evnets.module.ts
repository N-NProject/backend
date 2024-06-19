import { Module } from '@nestjs/common';
import { EvnetsController } from './evnets.controller';
import { EventsGateway } from './events.gateway'; // EventsGateway 추가

@Module({
  controllers: [EvnetsController],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
