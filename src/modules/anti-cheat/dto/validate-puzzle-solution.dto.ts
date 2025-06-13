import { IsString, IsArray, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MoveDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsOptional()
  from?: string;

  @ApiProperty()
  @IsOptional()
  to?: string;

  @ApiProperty()
  @IsOptional()
  value?: any;

  @ApiProperty()
  @IsNumber()
  timestamp: number;
}

export class ValidatePuzzleSolutionDto {
  @ApiProperty()
  @IsString()
  puzzleId: string;

  @ApiProperty()
  @IsString()
  puzzleType: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MoveDto)
  moves: MoveDto[];

  @ApiProperty()
  @IsNumber()
  solutionTime: number;

  @ApiProperty()
  @IsNumber()
  startTime: number;

  @ApiProperty()
  @IsNumber()
  endTime: number;

  @ApiProperty()
  @IsOptional()
  deviceInfo?: any;

  @ApiProperty()
  @IsOptional()
  browserInfo?: any;
}
