import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePuzzleDto } from './create-puzzle.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdatePuzzleDto extends PartialType(
  OmitType(CreatePuzzleDto, ['content'] as const),
) {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  versionReason?: string;
}
