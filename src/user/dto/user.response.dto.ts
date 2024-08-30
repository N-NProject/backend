import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Cursor } from '../../global/common/dto/cursor.dto';
import { Board } from '../../board/entities/board.entity';

class CreateBoards {
  @ValidateNested({ each: true })
  @Type(() => Board)
  data: Board[];

  @ValidateNested()
  @Type(() => Cursor)
  cursor: Cursor;
}

class JoinedBoards {
  @ValidateNested({ each: true })
  @Type(() => Board)
  data: Board[];

  @ValidateNested()
  @Type(() => Cursor)
  cursor: Cursor;
}

export class UserResponseDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  region: string;

  @ValidateNested()
  @Type(() => CreateBoards)
  createdBoards: CreateBoards;

  @ValidateNested()
  @Type(() => JoinedBoards)
  joinedBoards: JoinedBoards;
}
