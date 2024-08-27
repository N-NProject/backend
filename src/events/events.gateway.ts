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
    client.leave(client.id);
    client.data.chatRoomId = 'room:lobby';
    client.join('room:lobby');
  }

  handleDisconnect(client: Socket): void {
    const { chatRoomId } = client.data;
    if (
      chatRoomId !== 'room:lobby' &&
      !this.server.sockets.adapter.rooms.get(chatRoomId)
    ) {
      // client.id 대신 사용자의 실제 ID를 전달합니다.
      const userId = parseInt(client.data.userId, 10); // client.data.userId가 있다고 가정
      this.chatRoomService.leaveChatRoomByBoardId(
        parseInt(chatRoomId.split(':')[1]),
        userId,
      );
      this.server.emit('getChatRoomList', this.chatRoomService.getChatRooms());
    }
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
