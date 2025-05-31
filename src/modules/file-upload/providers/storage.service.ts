import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  PutObjectTaggingCommand,
  GetObjectTaggingCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import * as crypto from "crypto"
import * as path from "path"
import { StorageTier } from "../entities/file.entity"

export interface UploadResult {
  key: string
  url: string
  etag: string
  size: number
}

export interface PresignedUrlOptions {
  expiresIn?: number
  contentType?: string
  contentLength?: number
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly s3Client: S3Client
  private readonly bucketName: string
  private readonly region: string
  private readonly cdnDomain?: string

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>("AWS_REGION") || "us-east-1"
    this.bucketName = this.configService.get<string>("AWS_S3_BUCKET") || "logiquest-files"
    this.cdnDomain = this.configService.get<string>("AWS_CLOUDFRONT_DOMAIN")

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID") || "",
        secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "",
      },
    })
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
    options: {
      isPublic?: boolean
      storageTier?: StorageTier
      metadata?: Record<string, string>
    } = {},
  ): Promise<UploadResult> {
    const key = this.generateStorageKey(originalName, userId)
    const storageClass = this.getStorageClass(options.storageTier || StorageTier.HOT)

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        StorageClass: storageClass as import("@aws-sdk/client-s3").StorageClass,
        ACL: options.isPublic ? "public-read" : "private",
        Metadata: {
          userId,
          originalName,
          uploadedAt: new Date().toISOString(),
          ...options.metadata,
        },
        Tagging: this.buildTagString({
          userId,
          storageTier: options.storageTier || StorageTier.HOT,
          isPublic: options.isPublic ? "true" : "false",
        }),
      })

      const result = await this.s3Client.send(command)
      const url = this.getPublicUrl(key, !!options.isPublic)

      return {
        key,
        url,
        etag: result.ETag || "",
        size: buffer.length,
      }
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}:`, error)
      if (error instanceof Error) {
        throw new Error(`Upload failed: ${error.message}`)
      }
      throw new Error("Upload failed: Unknown error")
    }
  }

  async getPresignedUploadUrl(
    fileName: string,
    userId: string,
    options: PresignedUrlOptions = {},
  ): Promise<{ url: string; key: string; fields: Record<string, string> }> {
    const key = this.generateStorageKey(fileName, userId)
    const expiresIn = options.expiresIn || 3600 // 1 hour

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: options.contentType,
        ContentLength: options.contentLength,
        Metadata: {
          userId,
          uploadedAt: new Date().toISOString(),
        },
      })

      const url = await getSignedUrl(this.s3Client, command, { expiresIn })

      return {
        url,
        key,
        fields: {
          "Content-Type": options.contentType || "application/octet-stream",
          "x-amz-meta-userid": userId,
        },
      }
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${key}:`, error)
      if (error instanceof Error) {
        throw new Error(`Presigned URL generation failed: ${error.message}`)
      }
      throw new Error("Presigned URL generation failed: Unknown error")
    }
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      return await getSignedUrl(this.s3Client, command, { expiresIn })
    } catch (error) {
      this.logger.error(`Failed to generate download URL for ${key}:`, error)
      if (error instanceof Error) {
        throw new Error(`Download URL generation failed: ${error.message}`)
      }
      throw new Error("Download URL generation failed: Unknown error")
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.s3Client.send(command)
      this.logger.log(`File deleted: ${key}`)
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error)
      if (error instanceof Error) {
        throw new Error(`Delete failed: ${error.message}`)
      }
      throw new Error("Delete failed: Unknown error")
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
      })

      await this.s3Client.send(command)
      this.logger.log(`File copied from ${sourceKey} to ${destinationKey}`)
    } catch (error) {
      this.logger.error(`Failed to copy file from ${sourceKey} to ${destinationKey}:`, error)
      if (error instanceof Error) {
        throw new Error(`Copy failed: ${error.message}`)
      }
      throw new Error("Copy failed: Unknown error")
    }
  }

  async getFileMetadata(key: string): Promise<Record<string, any>> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const result = await this.s3Client.send(command)
      return {
        size: result.ContentLength,
        lastModified: result.LastModified,
        etag: result.ETag,
        contentType: result.ContentType,
        metadata: result.Metadata,
      }
    } catch (error) {
      this.logger.error(`Failed to get metadata for ${key}:`, error)
      if (error instanceof Error) {
        throw new Error(`Metadata retrieval failed: ${error.message}`)
      }
      throw new Error("Metadata retrieval failed: Unknown error")
    }
  }

  async changeStorageTier(key: string, tier: StorageTier): Promise<void> {
    try {
      const storageClass = this.getStorageClass(tier)
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${key}`,
        Key: key,
        StorageClass: storageClass as import("@aws-sdk/client-s3").StorageClass,
        MetadataDirective: "COPY",
      })

      await this.s3Client.send(command)

      // Update tags
      await this.updateFileTags(key, { storageTier: tier })

      this.logger.log(`Storage tier changed for ${key} to ${tier}`)
    } catch (error) {
      this.logger.error(`Failed to change storage tier for ${key}:`, error)
      if (error instanceof Error) {
        throw new Error(`Storage tier change failed: ${error.message}`)
      }
      throw new Error("Storage tier change failed: Unknown error")
    }
  }

  private async updateFileTags(key: string, tags: Record<string, string>): Promise<void> {
    try {
      // Get existing tags
      const getTagsCommand = new GetObjectTaggingCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const existingTags = await this.s3Client.send(getTagsCommand)
      const currentTags: Record<string, string> = {}

      if (existingTags.TagSet) {
        existingTags.TagSet.forEach((tag: { Key?: string; Value?: string }) => {
          if (tag.Key && tag.Value) {
            currentTags[tag.Key] = tag.Value
          }
        })
      }

      // Merge with new tags
      const updatedTags = { ...currentTags, ...tags }

      const putTagsCommand = new PutObjectTaggingCommand({
        Bucket: this.bucketName,
        Key: key,
        Tagging: {
          TagSet: Object.entries(updatedTags).map(([Key, Value]) => ({ Key, Value })),
        },
      })

      await this.s3Client.send(putTagsCommand)
    } catch (error) {
      this.logger.warn(`Failed to update tags for ${key}:`, error)
    }
  }

  private generateStorageKey(originalName: string, userId: string): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString("hex")
    const ext = path.extname(originalName)
    const baseName = path.basename(originalName, ext)
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_")

    return `users/${userId}/${timestamp}_${random}_${sanitizedName}${ext}`
  }

  private getStorageClass(tier: StorageTier): string {
    switch (tier) {
      case StorageTier.HOT:
        return "STANDARD"
      case StorageTier.WARM:
        return "STANDARD_IA"
      case StorageTier.COLD:
        return "GLACIER"
      case StorageTier.ARCHIVE:
        return "DEEP_ARCHIVE"
      default:
        return "STANDARD"
    }
  }

  private getPublicUrl(key: string, isPublic: boolean): string {
    if (!isPublic) {
      return ""
    }

    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${key}`
    }

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`
  }

  private buildTagString(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&")
  }
}
