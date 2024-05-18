import { IsString, MaxLength, MinLength } from 'class-validator';

export class UserDto {
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  readonly username?: string;

  @IsString()
  readonly region?: string;
}
