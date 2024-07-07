import { ApiProperty } from '@nestjs/swagger';

export class Cursor {
  @ApiProperty({ example: 10 })
  readonly count: number;

  @ApiProperty({ example: 'Y3JlYXRlZEF0OjE2OTYzMTg5OTc5Mzg' })
  readonly afterCursor: string | null;

  @ApiProperty({ example: null })
  readonly beforeCursor: string | null;
}
