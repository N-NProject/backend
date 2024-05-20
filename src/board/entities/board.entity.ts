import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { Timestamp } from '../../global/common/timeStamp';
import { Location } from '../../location/entities/location.entity';
import { Category } from '../../global/enums/category.enum';

@Entity('board')
export class Board extends Timestamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '게시판 ID' })
  id: number;

  @ManyToOne(() => User, (user) => user.boards)
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: '사용자 ID' })
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @ApiProperty({ description: '제목', nullable: true })
  title: string;

  @Column({ type: 'int' })
  @ApiProperty({ description: '최대 참가 인원' })
  max_capacity: number;

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '설명', nullable: true })
  description: string;

  @Column({ type: 'time', nullable: true })
  @ApiProperty({ description: '시작시간', nullable: true })
  start_time: string;

  @ManyToOne(() => Location, (location) => location.boards)
  @JoinColumn({ name: 'location_id' })
  @ApiProperty({ description: '위치' })
  location: Location;

  @Column({ type: 'enum', enum: Category, nullable: false })
  @ApiProperty({ description: '카테고리' })
  category: Category;

  @Column({ type: 'date', nullable: false })
  @ApiProperty({ description: '날짜', nullable: false })
  date: string;
}
