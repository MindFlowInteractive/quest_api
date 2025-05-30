import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsString,
} from 'class-validator';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
}

export class ExportDataDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entities?: string[];

  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean = true;

  @IsOptional()
  @IsBoolean()
  anonymize?: boolean = false;
}

export class ImportDataDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean = false;

  @IsOptional()
  @IsBoolean()
  skipErrors?: boolean = false;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  checksum?: string;
  recordCount: number;
  errors?: string[];
}
