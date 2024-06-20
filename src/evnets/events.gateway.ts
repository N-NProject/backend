import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('EventsGateway');

  constructor() {}

  @SubscribeMessage('events')
  handleEvent(@MessageBody() data: string): string {
    this.logger.log(`이벤트 데이터: ${data}`);
    return data;
  }

  afterInit(server: Server) {
    this.logger.log('웹소켓 서버 초기화 ✅');
    this.server = server;
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log(`Client Disconnected: ${client}`);
  }

  handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log(`Client Connected: ${client}`);
    client.on('message', (message: string) => {
      this.logger.log(`Received message: ${message}`);
      client.send(`Echo: ${message}`);
    });
    client.send('Welcome! 통신이 연결 되었습니다 :)');
  }

  public log(message: string) {
    this.logger.log(message);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() data: { chatRoomId: number; message: string },
    @ConnectedSocket() client: WebSocket,
  ): void {
    this.logger.log(`Message received: ${data.message}`);
    this.server.clients.forEach((connectedClient) => {
      if (
        connectedClient !== client &&
        connectedClient.readyState === WebSocket.OPEN
      ) {
        connectedClient.send(
          JSON.stringify({
            event: 'broadcastMessage',
            data: data.message,
            chatRoomId: data.chatRoomId,
          }),
        );
      }
    });
  }
}
