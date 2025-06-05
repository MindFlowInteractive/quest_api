/* eslint-disable prettier/prettier */
import { IsOptional, IsString } from 'class-validator';

export class SearchDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}
