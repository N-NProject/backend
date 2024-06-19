import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ChatRoom } from '../../chat-room/entities/chat-room.entity';
import { User } from '../../user/entities/user.entity';
import { Timestamp } from '../../global/common/timestamp';

@Entity('message')
export class Message extends Timestamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '메시지 ID' })
  id: number;

  @Column({ type: 'text', nullable: false })
  @ApiProperty({ description: '메시지 내용' })
  content: string;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages, {
    nullable: false,
  })
  @ApiProperty({ description: '채팅방' })
  chatRoom: ChatRoom;

  @ManyToOne(() => User, (user) => user.messages, { nullable: false })
  @ApiProperty({ description: '사용자' })
  user: User;
}
