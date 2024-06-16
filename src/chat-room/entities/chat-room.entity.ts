import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Timestamp } from '../../global/common/timeStamp';
import { ApiProperty } from '@nestjs/swagger';
import { Board } from '../../board/entities/board.entity';
import { UserChatRoom } from '../../user-chat-room/entities/user-chat-room.entity';

@Entity('chat_room')
export class ChatRoom extends Timestamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '채팅방 ID' })
  id: number;

  @Column({ name: 'chat_name', type: 'varchar', length: 100, nullable: false })
  @ApiProperty({ description: '채팅방 이름' })
  chat_name: string;

  @Column({ name: 'member_count', type: 'int', nullable: false })
  @ApiProperty({ description: '현재 채팅방 인원' })
  member_count: number;

  @Column({ name: 'max_member_count', type: 'int', nullable: false })
  @ApiProperty({ description: '채팅방 최대 인원' })
  max_member_count: number;

  @OneToOne(() => Board, (board) => board.chat_room)
  board: Board;

  @OneToMany(() => UserChatRoom, (userChatRoom) => userChatRoom.chatRoom)
  userChatRooms: UserChatRoom[];
}
