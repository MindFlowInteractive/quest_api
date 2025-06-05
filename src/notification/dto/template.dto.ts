/* eslint-disable prettier/prettier */
import { IsString } from 'class-validator';

export class TemplateDto {
  @IsString()
  title: string;

  @IsString()
  content: string;
}
