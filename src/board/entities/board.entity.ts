import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Timestamp } from '../../global/common/timestamp';
import { Category } from '../../global/enums/category.enum';
import { ChatRoom } from '../../chat-room/entities/chat-room.entity';

@Entity('board')
export class Board extends Timestamp {
  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '설명', nullable: true })
  description: string;

  @Column({ type: 'time', nullable: true })
  @ApiProperty({ description: '시작시간', nullable: true })
  start_time: string;

  // FIXME : 해당 브렌치에서는 Location Entity가 없어서 주석처리함
  // @ManyToOne(() => Location, (location) => location.boards)
  // @JoinColumn({ name: 'location_id' })
  // @ApiProperty({ description: '위치' })
  // location: Location;

  @Column({ type: 'enum', enum: Category, nullable: false })
  @ApiProperty({ description: '카테고리' })
  category: Category;

  @Column({ type: 'date', nullable: false })
  @ApiProperty({ description: '날짜', nullable: false })
  date: string;

  @ManyToOne(() => ChatRoom, (chat_room) => chat_room.boards)
  @JoinColumn({ name: 'chat_room_id' })
  @ApiProperty({ description: '채팅방' })
  chat_room: ChatRoom;
}
