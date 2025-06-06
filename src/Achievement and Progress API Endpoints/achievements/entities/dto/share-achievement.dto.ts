import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShareAchievementDto {
  @ApiProperty({
    description: 'Platform where the achievement will be shared (e.g. twitter, facebook)',
    example: 'twitter',
  })
  @IsString()
  platform: string;

  @ApiPropertyOptional({
    description: 'Optional message to accompany the achievement share',
    example: 'Just unlocked Puzzle Master! 🧠🏆',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Hashtags or tags to include in the post',
    example: ['#gaming', '#achievement', '#LogiQuest'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
