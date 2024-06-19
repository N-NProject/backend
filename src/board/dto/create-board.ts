import {
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsString,
  IsNumber,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../../global/enums/category.enum';

class LocationDto {
  @ApiProperty({ description: '위도' })
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  readonly latitude: number;

  @ApiProperty({ description: '경도' })
  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  readonly longitude: number;
}

export class CreateBoardDto {
  // @ApiProperty({ description: '게시물을 작성하는 사용자 ID' })
  // @IsNotEmpty()
  // @IsInt()
  // readonly userId: number;

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

  @ApiProperty({ description: '위치 좌표' })
  @IsNotEmpty()
  readonly location: LocationDto;

  @ApiProperty({ description: '위치 이름' })
  @IsNotEmpty()
  @IsString()
  readonly locationName: string;

  @ApiProperty({ description: '게시물 최대 참여 가능 인원' })
  @IsNotEmpty()
  @IsInt()
  readonly maxCapacity: number;

  @ApiProperty({ description: '만나는 날짜' })
  @IsNotEmpty()
  @IsString()
  readonly date: string;

  @ApiProperty({ description: '시작 시간' })
  @IsNotEmpty()
  @IsString()
  readonly startTime: string;
}
