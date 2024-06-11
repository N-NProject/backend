import { ApiProperty } from '@nestjs/swagger';

class UserDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty()
  username: string;
}

class LocationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty()
  location_name: string;
}

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
  user: UserDto;

  @ApiProperty()
  location: LocationDto;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  deleted_at: Date | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  currentPerson: number;
}
