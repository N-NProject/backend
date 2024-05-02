import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Timestamp } from '../../global/common/timeStamp';

@Entity('user')
export class User extends Timestamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '사용자 ID' })
  id: number;

  @Column({ nullable: true })
  @ApiProperty({ description: '카카오 계정 연동 ID', nullable: true })
  kakao: string;

  @Column({ length: 100 })
  @ApiProperty({ description: '사용자 이름' })
  name: string;

  @Column()
  @ApiProperty({ description: '사용자 이메일' })
  email: string;

  @Column()
  @ApiProperty({ description: '사용자 비밀번호' })
  password: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '사용자 지역', nullable: true })
  region: string;

  @Column({ type: 'enum', enum: ['Role1', 'Role2'], nullable: true })
  @ApiProperty({ description: '사용자 역할', enum: ['Role1', 'Role2'], nullable: true })
  belong: 'Role1' | 'Role2';

  @Column({ type: 'enum', enum: ['Position1', 'Position2'], nullable: true })
  @ApiProperty({ description: '사용자 포지션', enum: ['Position1', 'Position2'], nullable: true })
  position: 'Position1' | 'Position2';

  // 다음은 Timestamp 필드를 명시적으로 클래스에 추가
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @ApiProperty({ description: '생성 시간', default: 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '업데이트 시간', nullable: true })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '삭제 시간', nullable: true })
  deleted_at: Date;
}
