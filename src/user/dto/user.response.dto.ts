import { Board } from "src/board/entities/board.entity";

export class UserResponseDto {
  readonly username: string;
  readonly region: string;
  readonly createdBoards: Board[];
  readonly joinedBoards: Board[];
}
