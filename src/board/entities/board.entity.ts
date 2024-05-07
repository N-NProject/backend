import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Timestamp } from '../../global/common/timeStamp';

@Entity('boards')
export class Board extends Timestamp {
  @PrimaryGeneratedColumn('increment', { name: 'board_id' })
  @ApiProperty({ description: '게시글 ID' })
  id: number;

  @Column({ name: 'title', type: 'varchar', length: 100, nullable: false })
  @ApiProperty({ description: '게시글의 제목' })
  title: string;

  @Column({ name: 'max_capacity', type: 'int', nullable: false })
  @ApiProperty({ description: '게시글의 최대 참여 인원' })
  max_capacity: number;

  @Column({ name: 'description', type: 'text', nullable: false })
  @ApiProperty({ description: '게시글의 설명' })
  description: string;

  @Column({ name: 'time', type: 'timestamp', nullable: true })
  @ApiProperty({ description: '게시글의 특정 시간' })
  time: Date;

  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  @ApiProperty({ description: '생성 시간' })
  created_at: Date;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  @ApiProperty({ description: '업데이트 시간' })
  updated_at: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  @ApiProperty({ description: '삭제 시간' })
  deleted_at: Date;
}
