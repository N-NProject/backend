import { Injectable } from '@nestjs/common';
import { ChatRoom } from '../entities/chat-room.entity';
import { UpdateBoardDto } from '../../board/dto/update-board';

@Injectable()
export class ChatRoomMapper {
  updateChatRoomFromDto(
    chatRoom: ChatRoom,
    updateBoardDto: Partial<UpdateBoardDto>,
  ): ChatRoom {
    if (updateBoardDto.maxCapacity !== undefined) {
      chatRoom.maxMemberCount = updateBoardDto.maxCapacity;
    }
    return chatRoom;
  }
}
