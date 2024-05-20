import { IsOptional, IsString } from 'class-validator';

export class UserDto {
  @IsString()
  @IsOptional()
  readonly username?: string;

  @IsString()
  @IsOptional()
  readonly region?: string;
}
