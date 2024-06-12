import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateLocationDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsString()
  @IsNotEmpty()
  location_name: string;
}
