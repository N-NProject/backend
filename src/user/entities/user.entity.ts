import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Board } from '../../board/entities/board.entity'; // 경로에 주의하세요.

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '사용자 ID' })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  @ApiProperty({ description: '카카오 ID', nullable: true })
  kakao: string;

  @Column({ type: 'varchar', length: 100 })
  @ApiProperty({ description: '이름' })
  name: string;

  @Column({ type: 'varchar' })
  @ApiProperty({ description: '이메일' })
  email: string;

  @Column({ type: 'varchar' })
  @ApiProperty({ description: '비밀번호' })
  password: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @ApiProperty({ description: '지역', nullable: true })
  region: string;

  @CreateDateColumn()
  @ApiProperty({
    description: '계정 생성 시각',
    type: 'string',
    format: 'date-time',
  })
  created_at: Date;

  @UpdateDateColumn()
  @ApiProperty({
    description: '계정 업데이트 시각',
    type: 'string',
    format: 'date-time',
  })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({
    description: '계정 삭제 시각',
    nullable: true,
    type: 'string',
    format: 'date-time',
  })
  deleted_at: Date;

  @OneToMany(() => Board, (board) => board.user) // User to Boards 관계 정의
  boards: Board[];
}
