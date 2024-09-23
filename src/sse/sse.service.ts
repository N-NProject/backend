import { Injectable, Logger, Sse } from '@nestjs/common';
import { Subject } from 'rxjs';
import { SseResponseDto } from '../sse/dto/sse-response.dto';

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private roomUpdates: { [key: number]: Subject<SseResponseDto> } = {};

  // SSE 업데이트 주제 생성 또는 가져오기
  getOrCreateRoomUpdate(chatRoomId: number): Subject<SseResponseDto> {
    if (!this.roomUpdates[chatRoomId]) {
      this.roomUpdates[chatRoomId] = new Subject<SseResponseDto>();
    }
    return this.roomUpdates[chatRoomId];
  }

  // SSE 이벤트 전송
  notifyMemberCountChange(
    chatRoomId: number,
    currentCapacity: number,
    nickName?: string,
  ): void {
    const roomUpdateSubject = this.getOrCreateRoomUpdate(chatRoomId);

    const sseResponse = new SseResponseDto();
    sseResponse.currentPerson = currentCapacity;
    sseResponse.chatRoomId = chatRoomId;
    sseResponse.nickName = nickName || '';

    roomUpdateSubject.next(sseResponse);

    this.logger.log(
      `SSE event sent for chat room ${chatRoomId} with current person count ${sseResponse.currentPerson}, nickName: ${sseResponse.nickName}`,
    );
  }

  // 특정 채팅방의 SSE 업데이트를 구독하는 Observable 생성
  getRoomUpdatesObservable(chatRoomId: number) {
    return this.getOrCreateRoomUpdate(chatRoomId).asObservable();
  }
}
