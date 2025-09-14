import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class SyncSaveGameDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  slot: string;

  // client-sent raw JSON
  @IsNotEmpty()
  data: any;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsString()
  @IsOptional()
  platform?: string;

  // client last-updated timestamp (ISO string)
  @IsString()
  @IsOptional()
  clientUpdatedAt?: string;

  @IsBoolean()
  @IsOptional()
  isCloud?: boolean;
}
