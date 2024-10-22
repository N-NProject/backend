import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimeStamp } from '../../global/common/timeStamp';
import { ApiProperty } from '@nestjs/swagger';
import { Board } from '../../board/entities/board.entity';
import { UserChatRoom } from '../../user-chat-room/entities/user-chat-room.entity';
import { Message } from '../../message/entities/message.entity';

@Entity('chat_room')
export class ChatRoom extends TimeStamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '채팅방 ID' })
  id: number;

  @Column({ name: 'chat_name', type: 'varchar', length: 100, nullable: false })
  @ApiProperty({ description: '채팅방 이름' })
  chatName: string;

  @Column({ name: 'member_count', type: 'int', nullable: false })
  @ApiProperty({ description: '현재 채팅방 인원' })
  memberCount: number;

  @Column({ name: 'max_member_count', type: 'int', nullable: false })
  @ApiProperty({ description: '채팅방 최대 인원' })
  maxMemberCount: number;

  @OneToOne(() => Board, (board) => board.chatRoom, { onDelete: 'CASCADE' })
  @JoinColumn()
  board: Board;

  @OneToMany(() => UserChatRoom, (userChatRoom) => userChatRoom.chatRoom)
  userChatRooms: UserChatRoom[];

  @OneToMany(() => Message, (message) => message.chatRoom)
  messages: Message[];
}
