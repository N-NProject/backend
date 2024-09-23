import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ChatRoom } from '../../chat-room/entities/chat-room.entity';
import { User } from '../../user/entities/user.entity';
import { TimeStamp } from '../../global/common/timeStamp';

@Entity('message')
export class Message extends TimeStamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '메시지 ID' })
  id: number;

  @Column({ type: 'text', nullable: false })
  @ApiProperty({ description: '메시지 내용' })
  content: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '사용자 이름' })
  nickname: string;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages, {
    nullable: false,
  })
  @ApiProperty({ description: '채팅방' })
  chatRoom: ChatRoom;

  @ManyToOne(() => User, (user) => user.messages, { nullable: false })
  @ApiProperty({ description: '사용자' })
  user: User;
}
