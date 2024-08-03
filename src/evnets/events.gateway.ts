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
      this.chatRoomService.deleteChatRoom(parseInt(chatRoomId.split(':')[1]));
      this.server.emit(
        'getChatRoomList',
        this.chatRoomService.getChatRoomList(),
      );
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
    await this.chatRoomService.sendMessageToRoom(chatRoomId, {
      id: client.id,
      userId: message.userId,
      nickname: message.nickname,
      content: message.content,
    });
  }

  @SubscribeMessage('getChatRoomList')
  getChatRoomList(client: Socket, payload: any): void {
    client.emit('getChatRoomList', this.chatRoomService.getChatRoomList());
  }

  @SubscribeMessage('createChatRoom')
  async createChatRoom(
    client: Socket,
    roomName: string,
  ): Promise<{ chatRoomId: string; roomName: string }> {
    if (
      client.data.chatRoomId !== 'room:lobby' &&
      (await this.server.sockets.adapter.rooms.get(client.data.chatRoomId))
        .size === 1
    ) {
      this.chatRoomService.deleteChatRoom(client.data.chatRoomId);
    }

    await this.chatRoomService.createChatRoom(client, roomName);
    const room = await this.chatRoomService.getChatRoom(client.data.chatRoomId);
    return {
      chatRoomId: client.data.chatRoomId,
      roomName: room.chat_name,
    };
  }

  @SubscribeMessage('enterChatRoom')
  async enterChatRoom(
    client: Socket,
    chatRoomId: string,
  ): Promise<{ chatRoomId: string; roomName: string }> {
    if (client.rooms.has(chatRoomId)) {
      return;
    }
    if (
      client.data.chatRoomId !== 'room:lobby' &&
      (await this.server.sockets.adapter.rooms.get(client.data.chatRoomId))
        .size === 1
    ) {
      this.chatRoomService.deleteChatRoom(client.data.chatRoomId);
    }
    await this.chatRoomService.enterChatRoom(client, chatRoomId);
    const room = await this.chatRoomService.getChatRoom(
      parseInt(chatRoomId.split(':')[1]),
    );
    return {
      chatRoomId: chatRoomId,
      roomName: room.chat_name,
    };
  }
}
