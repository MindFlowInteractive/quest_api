import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository, FindOptionsWhere } from "typeorm"
import { FileEntity, FileStatus, FileType, StorageTier } from "../entities/file.entity"
import { FileMetadata } from "../entities/file-metadata.entity"
import { AnalyticsEvent } from "../entities/file-analytics.entity"
import type { StorageService } from "./storage.service"
import type { MediaProcessingService } from "./media-processing.service"
import type { FileValidationService } from "./file-validation.service"
import type { FileUploadDto, FileSearchDto, BulkOperationDto } from "../dto/file-upload.dto"
import * as crypto from "crypto"
import { FileMetadataService } from "./file-metadata.service"
import { FileAnalyticsService } from "./file-analytics.service"

export interface UploadResult {
  file: FileEntity
  processingResult?: any
  warnings?: string[]
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    private fileRepository: Repository<FileEntity>,
    private metadataRepository: Repository<FileMetadata>,
    private storageService: StorageService,
    private mediaProcessingService: MediaProcessingService,
    private validationService: FileValidationService,
    private metadataService: FileMetadataService,
    private analyticsService: FileAnalyticsService,
    @InjectRepository(FileEntity) private readonly fileEntityRepository: Repository<FileEntity>,
    @InjectRepository(FileMetadata) private readonly fileMetadataRepository: Repository<FileMetadata>,
  ) {}

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
    uploadDto: FileUploadDto = {},
    requestInfo?: { userAgent?: string; ipAddress?: string },
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = await this.validationService.validateFile(buffer, originalName, mimeType, {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        scanForMalware: true,
        checkFileIntegrity: true,
      })

      if (!validation.isValid) {
        throw new BadRequestException(`File validation failed: ${validation.errors.join(", ")}`)
      }

      // Create file entity
      const file = this.fileRepository.create({
        originalName,
        fileName: this.generateFileName(originalName),
        mimeType: validation.mimeType,
        fileType: validation.fileType,
        size: buffer.length,
        checksum: this.validationService.generateFileChecksum(buffer),
        status: FileStatus.UPLOADING,
        storageTier: uploadDto.storageTier || StorageTier.HOT,
        storageKey: "", // Will be set after upload
        isPublic: uploadDto.isPublic || false,
        expiresAt: uploadDto.expiresAt ? new Date(uploadDto.expiresAt) : undefined,
        userId,
      })

      // Save initial file record
      const savedFile = await this.fileRepository.save(file)

      try {
        // Upload to storage
        const uploadResult = await this.storageService.uploadFile(buffer, originalName, validation.mimeType, userId, {
          isPublic: uploadDto.isPublic,
          storageTier: uploadDto.storageTier,
          metadata: {
            fileId: savedFile.id,
            originalName,
            checksum: savedFile.checksum,
          },
        })

        // Update file with storage information
        savedFile.storageKey = uploadResult.key
        savedFile.publicUrl = uploadResult.url
        savedFile.status = FileStatus.PROCESSING

        await this.fileRepository.save(savedFile)

        // Process file if needed
        let processingResult
        if (uploadDto.compress || uploadDto.generateThumbnail) {
          processingResult = await this.mediaProcessingService.processFile(
            buffer,
            validation.mimeType,
            validation.fileType,
            {
              quality: 85,
              progressive: true,
            },
          )

          if (processingResult.success) {
            // Upload processed variants
            if (processingResult.thumbnailBuffer && uploadDto.generateThumbnail) {
              const thumbnailResult = await this.storageService.uploadFile(
                processingResult.thumbnailBuffer,
                `thumb_${originalName}`,
                "image/jpeg",
                userId,
                { isPublic: uploadDto.isPublic },
              )
              savedFile.thumbnailUrl = thumbnailResult.url
            }

            // Upload variants
            if (processingResult.variants) {
              const variants: Record<string, string> = {}
              for (const [variantName, variantBuffer] of Object.entries(processingResult.variants)) {
                const variantResult = await this.storageService.uploadFile(
                  variantBuffer as Buffer,
                  `${variantName}_${originalName}`,
                  "image/jpeg",
                  userId,
                  { isPublic: uploadDto.isPublic },
                )
                variants[variantName] = variantResult.url
              }
              savedFile.variants = variants
            }

            // Store processing metadata
            savedFile.processingMetadata = processingResult.metadata
          }
        }

        // Save metadata
        if (uploadDto.metadata) {
          try {
            const customMetadata = JSON.parse(uploadDto.metadata)
            await this.metadataService.saveMetadata(savedFile.id, customMetadata)
          } catch (error) {
            this.logger.warn("Failed to parse custom metadata:", error)
          }
        }

        // Save processing metadata
        if (processingResult?.metadata) {
          await this.metadataService.saveMetadata(savedFile.id, processingResult.metadata, "processing")
        }

        // Update status to ready
        savedFile.status = FileStatus.READY
        await this.fileRepository.save(savedFile)

        // Record analytics
        await this.analyticsService.recordEvent(savedFile.id, AnalyticsEvent.UPLOAD, requestInfo, {
          fileSize: savedFile.size,
          fileType: savedFile.fileType,
          processingTime: Date.now() - savedFile.createdAt.getTime(),
        })

        return {
          file: savedFile,
          processingResult,
          warnings: validation.warnings,
        }
      } catch (error) {
        // Update status to error
        savedFile.status = FileStatus.ERROR
        await this.fileRepository.save(savedFile)
        throw error
      }
    } catch (error) {
      this.logger.error("File upload failed:", error)
      throw error
    }
  }

  async getFile(fileId: string, userId?: string): Promise<FileEntity> {
    const whereCondition: FindOptionsWhere<FileEntity> = { id: fileId }
    if (userId) {
      whereCondition.userId = userId
    }

    const file = await this.fileRepository.findOne({
      where: whereCondition,
      relations: ["metadata", "shares"],
    })

    if (!file) {
      throw new NotFoundException("File not found")
    }

    return file
  }

  async getUserFiles(
    userId: string,
    searchDto: FileSearchDto = {},
  ): Promise<{
    files: FileEntity[]
    total: number
    page: number
    limit: number
  }> {
    const {
      query,
      fileType,
      minSize,
      maxSize,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = searchDto

    const queryBuilder = this.fileRepository
      .createQueryBuilder("file")
      .where("file.userId = :userId", { userId })
      .andWhere("file.status != :deletedStatus", { deletedStatus: FileStatus.DELETED })

    // Apply filters
    if (query) {
      queryBuilder.andWhere("(file.originalName ILIKE :query OR file.fileName ILIKE :query)", { query: `%${query}%` })
    }

    if (fileType) {
      queryBuilder.andWhere("file.fileType = :fileType", { fileType })
    }

    if (minSize !== undefined) {
      queryBuilder.andWhere("file.size >= :minSize", { minSize })
    }

    if (maxSize !== undefined) {
      queryBuilder.andWhere("file.size <= :maxSize", { maxSize })
    }

    if (startDate) {
      queryBuilder.andWhere("file.createdAt >= :startDate", { startDate: new Date(startDate) })
    }

    if (endDate) {
      queryBuilder.andWhere("file.createdAt <= :endDate", { endDate: new Date(endDate) })
    }

    // Apply sorting
    queryBuilder.orderBy(`file.${sortBy}`, sortOrder)

    // Apply pagination
    const offset = (page - 1) * limit
    queryBuilder.skip(offset).take(limit)

    const [files, total] = await queryBuilder.getManyAndCount()

    return {
      files,
      total,
      page,
      limit,
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.getFile(fileId, userId)

    // Soft delete - mark as deleted
    file.status = FileStatus.DELETED
    await this.fileRepository.save(file)

    // Delete from storage
    try {
      await this.storageService.deleteFile(file.storageKey)

      // Delete variants
      if (file.variants) {
        for (const variantUrl of Object.values(file.variants)) {
          const variantKey = this.extractKeyFromUrl(variantUrl)
          if (variantKey) {
            await this.storageService.deleteFile(variantKey)
          }
        }
      }

      // Delete thumbnail
      if (file.thumbnailUrl) {
        const thumbnailKey = this.extractKeyFromUrl(file.thumbnailUrl)
        if (thumbnailKey) {
          await this.storageService.deleteFile(thumbnailKey)
        }
      }
    } catch (error) {
      this.logger.error(`Failed to delete file from storage: ${file.storageKey}`, error)
    }

    // Record analytics
    await this.analyticsService.recordEvent(fileId, AnalyticsEvent.DELETE)
  }

  async bulkOperation(
    userId: string,
    bulkDto: BulkOperationDto,
  ): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const result: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    }

    for (const fileId of bulkDto.fileIds) {
      try {
        const file = await this.getFile(fileId, userId)

        switch (bulkDto.operation) {
          case "delete":
            await this.deleteFile(fileId, userId)
            break
          case "archive":
            await this.changeStorageTier(fileId, userId, StorageTier.ARCHIVE)
            break
          case "restore":
            file.status = FileStatus.READY
            await this.fileRepository.save(file)
            break
          case "changeStorageTier":
            const newTier = bulkDto.parameters?.storageTier as StorageTier
            if (newTier) {
              await this.changeStorageTier(fileId, userId, newTier)
            }
            break
        }

        result.success++
      } catch (error) {
        result.failed++
        result.errors.push(`File ${fileId}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return result
  }

  async changeStorageTier(fileId: string, userId: string, newTier: StorageTier): Promise<void> {
    const file = await this.getFile(fileId, userId)

    if (file.storageTier === newTier) {
      return // No change needed
    }

    // Update storage tier in cloud storage
    await this.storageService.changeStorageTier(file.storageKey, newTier)

    // Update database
    file.storageTier = newTier
    await this.fileRepository.save(file)

    this.logger.log(`Storage tier changed for file ${fileId} to ${newTier}`)
  }

  async getFileStats(userId: string): Promise<{
    totalFiles: number
    totalSize: number
    filesByType: Record<FileType, number>
    storageByTier: Record<StorageTier, { count: number; size: number }>
  }> {
    const files = await this.fileRepository.find({
      where: { userId, status: FileStatus.READY },
    })

    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + Number(file.size), 0),
      filesByType: {} as Record<FileType, number>,
      storageByTier: {} as Record<StorageTier, { count: number; size: number }>,
    }

    // Initialize counters
    Object.values(FileType).forEach((type) => {
      stats.filesByType[type] = 0
    })

    Object.values(StorageTier).forEach((tier) => {
      stats.storageByTier[tier] = { count: 0, size: 0 }
    })

    // Count files by type and storage tier
    files.forEach((file) => {
      stats.filesByType[file.fileType]++
      stats.storageByTier[file.storageTier].count++
      stats.storageByTier[file.storageTier].size += Number(file.size)
    })

    return stats
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString("hex")
    const extension = originalName.substring(originalName.lastIndexOf("."))
    const baseName = originalName.substring(0, originalName.lastIndexOf("."))
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_")

    return `${sanitizedName}_${timestamp}_${random}${extension}`
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname.substring(1) // Remove leading slash
    } catch {
      return null
    }
  }
}
