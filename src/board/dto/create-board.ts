import { IsNotEmpty, IsEnum, IsInt, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../../global/enums/category.enum';

export class CreateBoardDto {
  @ApiProperty({ description: '게시물을 작성하는 사용자 ID' })
  @IsNotEmpty()
  readonly user_id: number;

  @ApiProperty({ description: '게시물의 제목' })
  @IsNotEmpty()
  @IsString()
  readonly title: string;

  @ApiProperty({ description: '게시물의 카테고리' })
  @IsNotEmpty()
  @IsEnum(Category)
  readonly category: Category;

  @ApiProperty({ description: '게시물 설명' })
  @IsNotEmpty()
  @IsString()
  readonly description: string;

  @ApiProperty({ description: '위치 ID' })
  @IsNotEmpty()
  @IsInt()
  readonly location_id: number;

  @ApiProperty({ description: '게시물 최대 참여 가능 인원' })
  @IsNotEmpty()
  @IsInt()
  readonly max_capacity: number;

  @ApiProperty({ description: ' 만나는 날짜' })
  @IsNotEmpty()
  @IsString()
  readonly date: string;

  @ApiProperty({ description: '시작 시간' })
  @IsNotEmpty()
  @IsString()
  readonly start_time: string;

  @ApiProperty({ description: ' 종료 시간' })
  @IsNotEmpty()
  @IsString()
  readonly end_time: string;
}
