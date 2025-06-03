import { IsUUID, IsOptional, IsInt, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillLevel } from '../entities/user-progress.entity';

export class CreateProgressDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Initial experience points' })
  @IsOptional()
  @IsInt()
  experiencePoints?: number;

  @ApiPropertyOptional({ description: 'Initial skill level' })
  @IsOptional()
  @IsEnum(SkillLevel)
  currentSkillLevel?: SkillLevel;
}
