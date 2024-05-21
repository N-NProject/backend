import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamp } from '../../global/common/timeStamp';
import { ApiProperty } from '@nestjs/swagger';
import { Board } from '../../board/entities/board.entity';

@Entity('chat_room')
export class ChatRoom extends Timestamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '채팅방 ID' })
  id: number;

  @Column({ name: 'chat_name', type: 'varchar', length: 100, nullable: false })
  @ApiProperty({ description: '채팅방 이름' })
  chat_name: string;

  @Column({ name: 'member_count', type: 'int', nullable: false })
  @ApiProperty({ description: '채팅방 전체 인원' })
  member_count: string;

  @OneToMany(() => Board, (board) => board.chat_room)
  boards: Board[];
}
