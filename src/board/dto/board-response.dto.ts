import { ApiProperty } from '@nestjs/swagger';

export class BoardResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  max_capacity: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  start_time: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  user: {
    user_id: number;
    username: string;
  };

  @ApiProperty()
  location: {
    id: number;
    latitude: number;
    longitude: number;
    location_name: string;
  };

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  deleted_at: Date | null;

  @ApiProperty()
  status: string;
}
