import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Board } from '../../board/entities/board.entity';

@Entity('location')
export class Location {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '위치 ID' })
  id: number;

  @Column({ type: 'float', nullable: false })
  @ApiProperty({ description: '위도', nullable: false })
  latitude: number;

  @Column({ type: 'float', nullable: false })
  @ApiProperty({ description: '경도', nullable: false })
  longitude: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  @ApiProperty({ description: '위치 이름', nullable: false })
  locationName: string;

  @Column({ type: 'int', nullable: true })
  @ApiProperty({ description: '위치 순서', nullable: true })
  sequence: number;

  @OneToMany(() => Board, (board) => board.location)
  boards: Board[];
}
