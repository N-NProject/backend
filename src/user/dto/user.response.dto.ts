import { Cursor } from '../../global/common/dto/cursor.dto';
import { Board } from '../../board/entities/board.entity';

class CreateBoards {
  data: Board[];
  cursor: Cursor;
}

class JoinedBoards {
  data: Board[];
  cursor: Cursor;
}

export class UserResponseDto {
  username: string;
  region: string;
  createdBoards: CreateBoards;
  joinedBoards: JoinedBoards;
}
