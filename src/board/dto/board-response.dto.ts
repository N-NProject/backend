import { ApiProperty } from '@nestjs/swagger';

class UserDto {
  @ApiProperty()
  userId: number;

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
  locationName: string;
}

export class BoardResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  maxCapacity: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  user: UserDto;

  @ApiProperty()
  location: LocationDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  currentPerson: number;

  @ApiProperty()
  editable: boolean;
}
