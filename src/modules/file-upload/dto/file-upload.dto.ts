import { IsOptional, IsBoolean, IsEnum, IsString, IsNumber, IsDateString, IsArray, Min, Max } from "class-validator"
import { Type, Transform } from "class-transformer"
import { ApiProperty } from "@nestjs/swagger"
import { FileType, StorageTier } from "../entities/file.entity"

export class FileUploadDto {
  @ApiProperty({ description: "Make file publicly accessible", required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isPublic?: boolean = false

  @ApiProperty({ description: "File expiration date", required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @ApiProperty({ description: "Storage tier for the file", required: false })
  @IsOptional()
  @IsEnum(StorageTier)
  storageTier?: StorageTier = StorageTier.HOT

  @ApiProperty({ description: "Custom metadata for the file", required: false })
  @IsOptional()
  @IsString()
  metadata?: string // JSON string

  @ApiProperty({ description: "Generate thumbnail for images", required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  generateThumbnail?: boolean = true

  @ApiProperty({ description: "Compress file if possible", required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  compress?: boolean = true
}

export class FileProcessingOptionsDto {
  @ApiProperty({ description: "Image quality for compression (1-100)", required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quality?: number = 85

  @ApiProperty({ description: "Maximum width for image resize", required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxWidth?: number

  @ApiProperty({ description: "Maximum height for image resize", required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxHeight?: number

  @ApiProperty({ description: "Output format for conversion", required: false })
  @IsOptional()
  @IsString()
  outputFormat?: string

  @ApiProperty({ description: "Generate progressive JPEG", required: false })
  @IsOptional()
  @IsBoolean()
  progressive?: boolean = true
}

export class FileShareDto {
  @ApiProperty({ description: "Share password", required: false })
  @IsOptional()
  @IsString()
  password?: string

  @ApiProperty({ description: "Share expiration date", required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @ApiProperty({ description: "Maximum number of downloads", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDownloads?: number = 0

  @ApiProperty({ description: "User ID to share with", required: false })
  @IsOptional()
  @IsString()
  sharedWithUserId?: string

  @ApiProperty({ description: "Share permissions", required: false })
  @IsOptional()
  permissions?: Record<string, boolean>
}

export class FileSearchDto {
  @ApiProperty({ description: "Search query", required: false })
  @IsOptional()
  @IsString()
  query?: string

  @ApiProperty({ description: "File type filter", required: false })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType

  @ApiProperty({ description: "Minimum file size in bytes", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSize?: number

  @ApiProperty({ description: "Maximum file size in bytes", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSize?: number

  @ApiProperty({ description: "Start date for search", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiProperty({ description: "End date for search", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiProperty({ description: "Page number", required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @ApiProperty({ description: "Items per page", required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20

  @ApiProperty({ description: "Sort field", required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt"

  @ApiProperty({ description: "Sort order", required: false })
  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC"
}

export class BulkOperationDto {
  @ApiProperty({ description: "Array of file IDs" })
  @IsArray()
  @IsString({ each: true })
  fileIds!: string[]

  @ApiProperty({ description: "Operation to perform" })
  @IsString()
  operation!: "delete" | "archive" | "restore" | "changeStorageTier"

  @ApiProperty({ description: "Additional parameters for the operation", required: false })
  @IsOptional()
  parameters?: Record<string, any>
}
