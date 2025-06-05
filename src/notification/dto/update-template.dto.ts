/* eslint-disable prettier/prettier */
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class UpdateTemplateDto {
  @IsNumber()
  id: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
