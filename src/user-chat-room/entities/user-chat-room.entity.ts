import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { ChatRoom } from '../../chat-room/entities/chat-room.entity';

@Entity('user_chat_room')
export class UserChatRoom {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '유저-채팅방 연결 ID' })
  id: number;

  @ManyToOne(() => User, (user) => user.userChatRooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: '유저 ID' })
  user: User;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.userChatRooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chat_room_id' })
  @ApiProperty({ description: '채팅방 ID' })
  chatRoom: ChatRoom;
}
