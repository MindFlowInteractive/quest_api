import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateSaveGameDto {
  @IsOptional()
  data?: any;

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsBoolean()
  isCloud?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
