import {
  IsOptional,
  IsEnum,
  IsInt,
  IsString,
  IsObject,
  IsNumber,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../../global/enums/category.enum';

class LocationDto {
  @ApiProperty({ description: '위도' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ description: '경도' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class UpdateBoardDto {
  @ApiProperty({ description: '게시물의 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '게시물의 카테고리' })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @ApiProperty({ description: '게시물 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '위치 정보' })
  @IsOptional()
  @IsObject()
  location?: LocationDto;

  @ApiProperty({ description: '위치 이름' })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiProperty({ description: '게시물 최대 참여 가능 인원' })
  @IsOptional()
  @IsInt()
  maxCapacity?: number;

  @ApiProperty({ description: '만나는 날짜' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ description: '시작 시간' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: '유저 ID' })
  @IsOptional()
  @IsInt()
  userId?: number;
}
