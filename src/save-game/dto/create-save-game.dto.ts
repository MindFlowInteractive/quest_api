import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateSaveGameDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  slot: string;

  // The raw game-state JSON (client sends JSON)
  @IsNotEmpty()
  data: any;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsBoolean()
  @IsOptional()
  isCloud?: boolean;

  @IsString()
  @IsOptional()
  note?: string;
}
