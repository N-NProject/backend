import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway(3000, {
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('EventsGateway');

  constructor() {}

  @SubscribeMessage('ClientToServer')
  async handleMessage(@MessageBody() data: string) {
    this.server.emit('ServerToClient', data);
  }

  @SubscribeMessage('events')
  handleEvent(@MessageBody() data: string): string {
    this.logger.log(`이벤트 데이터: ${data}`);
    return data;
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket 서버 초기화');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`클라이언트 연결 해제: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`클라이언트 연결됨: ${client.id}`);
  }

  public log(message: string) {
    this.logger.log(message);
  }
}
