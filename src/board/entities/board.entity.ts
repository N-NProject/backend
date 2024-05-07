import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { Timestamp } from '../../global/common/timestamp';

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
}
