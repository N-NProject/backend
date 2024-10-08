import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatRoomService } from '../chat-room/chat-room.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('EventsGateway');

  constructor(
    @Inject(forwardRef(() => ChatRoomService))
    private readonly chatRoomService: ChatRoomService,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.log('Client connected: ' + client.id);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log('Client disconnected: ' + client.id);
  }
  broadcastMessage(event: string, message: any) {
    this.logger.log(`Broadcasting message: ${JSON.stringify(message)}`);
    this.server.emit(event, message);
  }

  log(message: string) {
    this.logger.log(message);
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    client: Socket,
    message: { content: string; userId: number; nickname: string },
  ): Promise<void> {
    const { chatRoomId } = client.data;

    await this.chatRoomService.sendMessage(
      chatRoomId,
      message.userId,
      message.content,
      message.nickname,
    );
  }
}
