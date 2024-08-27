import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { ChatRoomModule } from '../chat-room/chat-room.module';

@Module({
  imports: [forwardRef(() => ChatRoomModule)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
