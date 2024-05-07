import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';

@Entity('board')
export class Board {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '게시판 ID' })
  id: number;

  @ManyToOne(() => User, (user) => user.boards) // Many Boards to one User 관계 정의
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

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({
    description: '시간',
    nullable: true,
    type: 'string',
    format: 'date-time',
  })
  time: Date;

  @CreateDateColumn()
  @ApiProperty({
    description: '생성 시각',
    type: 'string',
    format: 'date-time',
  })
  created_at: Date;

  @UpdateDateColumn()
  @ApiProperty({
    description: '업데이트 시각',
    type: 'string',
    format: 'date-time',
  })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({
    description: '삭제 시각',
    nullable: true,
    type: 'string',
    format: 'date-time',
  })
  deleted_at: Date;
}
