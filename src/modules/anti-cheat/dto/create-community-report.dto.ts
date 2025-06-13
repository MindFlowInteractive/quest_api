import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommunityReportDto {
  @ApiProperty()
  @IsString()
  reportedUserId: string;

  @ApiProperty()
  @IsEnum(['cheating', 'unfair_play', 'suspicious_behavior', 'other'])
  reportType: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsOptional()
  evidence?: any;
}
