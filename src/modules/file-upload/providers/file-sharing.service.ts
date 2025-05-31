import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { FileShare, ShareType } from "../entities/file-share.entity"
import { FileEntity } from "../entities/file.entity"
import type { FileAnalyticsService } from "./file-analytics.service"
import { AnalyticsEvent } from "../entities/file-analytics.entity"
import type { FileShareDto } from "../dto/file-upload.dto"
import * as crypto from "crypto"
import * as bcrypt from "bcrypt"

export interface ShareResult {
  shareToken: string
  shareUrl: string
  expiresAt?: Date
  maxDownloads?: number
}

@Injectable()
export class FileSharingService {
  private readonly logger = new Logger(FileSharingService.name)
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(FileShare)
    private readonly shareRepository: Repository<FileShare>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly analyticsService: FileAnalyticsService,
  ) {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  async createShare(
    fileId: string,
    userId: string,
    shareDto: FileShareDto,
    shareType: ShareType = ShareType.PUBLIC_LINK,
  ): Promise<ShareResult> {
    // Verify file ownership
    const file = await this.fileRepository.findOne({
      where: { id: fileId, userId },
    })

    if (!file) {
      throw new NotFoundException("File not found")
    }

    // Generate share token
    const shareToken = this.generateShareToken()

    // Hash password if provided
    let hashedPassword: string | undefined
    if (shareDto.password) {
      hashedPassword = await bcrypt.hash(shareDto.password, 10)
    }

    // Create share record
    const share = this.shareRepository.create({
      file,
      shareType,
      shareToken,
      password: hashedPassword,
      expiresAt: shareDto.expiresAt ? new Date(shareDto.expiresAt) : undefined,
      maxDownloads: shareDto.maxDownloads || 0,
      permissions: shareDto.permissions || { download: true, view: true },
      sharedByUserId: userId,
      sharedWithUserId: shareDto.sharedWithUserId,
    })

    const savedShare = await this.shareRepository.save(share)

    // Record analytics
    await this.analyticsService.recordEvent(fileId, AnalyticsEvent.SHARE, undefined, {
      shareType,
      hasPassword: !!shareDto.password,
      hasExpiration: !!shareDto.expiresAt,
    })

    return {
      shareToken,
      shareUrl: `${this.baseUrl}/api/v1/file-upload/shared/${shareToken}`,
      expiresAt: savedShare.expiresAt,
      maxDownloads: savedShare.maxDownloads,
    }
  }

  async getSharedFile(shareToken: string, password?: string): Promise<{ file: FileEntity; share: FileShare }> {
    const share = await this.shareRepository.findOne({
      where: { shareToken, isActive: true },
      relations: ["file"],
    })

    if (!share) {
      throw new NotFoundException("Share not found")
    }

    // Check if share is expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenException("Share has expired")
    }

    // Check download limit
    if (share.maxDownloads > 0 && share.downloadCount >= share.maxDownloads) {
      throw new ForbiddenException("Download limit exceeded")
    }

    // Check password
    if (share.password) {
      if (!password) {
        throw new ForbiddenException("Password required")
      }

      const isPasswordValid = await bcrypt.compare(password, share.password)
      if (!isPasswordValid) {
        throw new ForbiddenException("Invalid password")
      }
    }

    return { file: share.file, share }
  }

  async downloadSharedFile(
    shareToken: string,
    password?: string,
    requestInfo?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ file: FileEntity; downloadUrl: string }> {
    const { file, share } = await this.getSharedFile(shareToken, password)

    // Check download permission
    if (!share.permissions?.download) {
      throw new ForbiddenException("Download not permitted")
    }

    // Increment download count
    await this.shareRepository.increment({ id: share.id }, "downloadCount", 1)

    // Record analytics
    await this.analyticsService.recordEvent(file.id, AnalyticsEvent.DOWNLOAD, requestInfo, {
      shareToken,
      shareType: share.shareType,
    })

    // Generate download URL (this would typically be a presigned URL)
    const downloadUrl = file.publicUrl || `${this.baseUrl}/api/v1/file-upload/download/${file.id}`

    return { file, downloadUrl }
  }

  async getUserShares(userId: string): Promise<FileShare[]> {
    return this.shareRepository.find({
      where: { sharedByUserId: userId },
      relations: ["file"],
      order: { createdAt: "DESC" },
    })
  }

  async revokeShare(shareId: string, userId: string): Promise<void> {
    const share = await this.shareRepository.findOne({
      where: { id: shareId, sharedByUserId: userId },
    })

    if (!share) {
      throw new NotFoundException("Share not found")
    }

    share.isActive = false
    await this.shareRepository.save(share)
  }

  async createSocialMediaShare(
    fileId: string,
    userId: string,
    platform: string,
    metadata?: Record<string, any>,
  ): Promise<ShareResult> {
    const shareResult = await this.createShare(
      fileId,
      userId,
      { maxDownloads: 0 }, // No download limit for social media
      ShareType.SOCIAL_MEDIA,
    )

    // Update share with social media metadata
    await this.shareRepository.update(
      { shareToken: shareResult.shareToken },
      {
        socialMetadata: {
          platform: platform,
          ...(metadata || {}),
        } as any, // Cast to any to satisfy the type checker
      },
    )

    return shareResult
  }

  private generateShareToken(): string {
    return crypto.randomBytes(32).toString("hex")
  }

  async getShareAnalytics(
    shareId: string,
    userId: string,
  ): Promise<{
    totalViews: number
    totalDownloads: number
    recentActivity: Array<{
      event: string
      timestamp: Date
      metadata?: any
    }>
  }> {
    const share = await this.shareRepository.findOne({
      where: { id: shareId, sharedByUserId: userId },
      relations: ["file"],
    })

    if (!share) {
      throw new NotFoundException("Share not found")
    }

    // Get analytics for this share
    const analytics = await this.analyticsService.getAnalyticsReport(userId, share.createdAt, new Date())

    return {
      totalViews: share.file.viewCount,
      totalDownloads: share.downloadCount,
      recentActivity: [], // This would be populated from analytics data
    }
  }
}
