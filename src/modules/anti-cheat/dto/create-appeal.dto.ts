import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppealDto {
  @ApiProperty()
  @IsString()
  cheatDetectionId: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty()
  @IsOptional()
  evidence?: any;
}
