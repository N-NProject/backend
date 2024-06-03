import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Board } from '../../board/entities/board.entity';
import { Timestamp } from '../../global/common/timestamp';
import { UserChatRoom } from '../../user-chat-room/entities/user-chat-room.entity';

@Entity('user')
export class User extends Timestamp {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'user_id' })
  id: number;

  @Column({ name: 'kakao_id', type: 'bigint', unique: true })
  @ApiProperty({ description: 'kakaoId' })
  kakaoId: number;

  @Column({ nullable: true })
  @ApiProperty({ description: 'username' })
  username: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '지역' })
  region: string;

  @OneToMany(() => Board, (board) => board.user)
  boards: Board[];

  @OneToMany(() => UserChatRoom, (userChatRoom) => userChatRoom.user)
  userChatRooms: UserChatRoom[];
}
