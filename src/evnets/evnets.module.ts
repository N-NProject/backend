import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway'; // EventsGateway 추가

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
