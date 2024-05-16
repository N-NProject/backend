import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Board } from '../../board/entities/board.entity';

@Entity('location')
export class Location {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '위치 ID' })
  id: number;

  @Column({
    type: 'geometry',
    nullable: false,
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  @ApiProperty({ description: '좌표', nullable: false })
  coordinate: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  @ApiProperty({ description: '위치 이름', nullable: false })
  location_name: string;

  @Column({ type: 'int', nullable: true })
  @ApiProperty({ description: '위치 순서', nullable: true })
  sequence: number;

  @OneToMany(() => Board, (board) => board.location)
  boards: Board[];
}
