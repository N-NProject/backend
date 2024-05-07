import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Board } from '../../board/entities/board.entity';
import { Timestamp } from '../../global/common/timestamp';
@Entity('user')
export class User extends Timestamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'user_id' })
  id: number;

  @Column({ name: 'kakao_id', unique: true })
  @ApiProperty({ description: 'kakao_id' })
  kakaoId: number;

  @Column()
  @ApiProperty({ description: 'UserName' })
  username: string;

  @Column()
  @ApiProperty({ description: '지역' })
  region: string;

  @OneToMany(() => Board, (board) => board.user)
  boards: Board[];
}
