import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { Cron, CronExpression } from "@nestjs/schedule"
import { type FileEntity, StorageTier } from "../entities/file.entity"
import type { StorageService } from "./storage.service"

export interface BackupStrategy {
  name: string
  schedule: string
  retentionDays: number
  storageTier: StorageTier
  includeVariants: boolean
}

@Injectable()
export class FileBackupService {
  private readonly logger = new Logger(FileBackupService.name)

  private readonly backupStrategies: BackupStrategy[] = [
    {
      name: "daily_hot",
      schedule: CronExpression.EVERY_DAY_AT_2AM,
      retentionDays: 7,
      storageTier: StorageTier.HOT,
      includeVariants: true,
    },
    {
      name: "weekly_warm",
      schedule: CronExpression.EVERY_WEEK,
      retentionDays: 30,
      storageTier: StorageTier.WARM,
      includeVariants: false,
    },
    {
      name: "monthly_cold",
      schedule: CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT,
      retentionDays: 365,
      storageTier: StorageTier.COLD,
      includeVariants: false,
    },
  ]

  constructor(
    private fileRepository: Repository<FileEntity>,
    private storageService: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performDailyBackup(): Promise<void> {
    await this.executeBackupStrategy("daily_hot")
  }

  @Cron(CronExpression.EVERY_WEEK)
  async performWeeklyBackup(): Promise<void> {
    await this.executeBackupStrategy("weekly_warm")
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async performMonthlyBackup(): Promise<void> {
    await this.executeBackupStrategy("monthly_cold")
  }

  private async executeBackupStrategy(strategyName: string): Promise<void> {
    const strategy = this.backupStrategies.find((s) => s.name === strategyName)
    if (!strategy) {
      this.logger.error(`Backup strategy ${strategyName} not found`)
      return
    }

    this.logger.log(`Starting backup strategy: ${strategyName}`)

    try {
      // Get files that need backup
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 1) // Files older than 1 day

      const files = await this.fileRepository
        .createQueryBuilder("file")
        .where("file.createdAt <= :cutoffDate", { cutoffDate })
        .andWhere("file.status = :status", { status: "ready" })
        .andWhere("file.storageTier = :tier", { tier: StorageTier.HOT })
        .getMany()

      let backedUpCount = 0
      let errorCount = 0

      for (const file of files) {
        try {
          await this.backupFile(file, strategy)
          backedUpCount++
        } catch (error) {
          this.logger.error(`Failed to backup file ${file.id}:`, error)
          errorCount++
        }
      }

      this.logger.log(
        `Backup strategy ${strategyName} completed. ` + `Backed up: ${backedUpCount}, Errors: ${errorCount}`,
      )

      // Cleanup old backups
      await this.cleanupOldBackups(strategy)
    } catch (error) {
      this.logger.error(`Backup strategy ${strategyName} failed:`, error)
    }
  }

  private async backupFile(file: FileEntity, strategy: BackupStrategy): Promise<void> {
    const backupKey = this.generateBackupKey(file, strategy)

    // Copy main file to backup location
    await this.storageService.copyFile(file.storageKey, backupKey)

    // Copy variants if required
    if (strategy.includeVariants && file.variants) {
      for (const [variantName, variantUrl] of Object.entries(file.variants)) {
        const variantKey = this.extractKeyFromUrl(variantUrl)
        if (variantKey) {
          const backupVariantKey = this.generateBackupKey(file, strategy, variantName)
          await this.storageService.copyFile(variantKey, backupVariantKey)
        }
      }
    }

    // Copy thumbnail if exists
    if (file.thumbnailUrl) {
      const thumbnailKey = this.extractKeyFromUrl(file.thumbnailUrl)
      if (thumbnailKey) {
        const backupThumbnailKey = this.generateBackupKey(file, strategy, "thumbnail")
        await this.storageService.copyFile(thumbnailKey, backupThumbnailKey)
      }
    }

    this.logger.debug(`File ${file.id} backed up to ${backupKey}`)
  }

  private async cleanupOldBackups(strategy: BackupStrategy): Promise<void> {
    // This would implement cleanup logic for old backups
    // For now, we'll just log the action
    this.logger.log(`Cleaning up backups older than ${strategy.retentionDays} days for strategy ${strategy.name}`)
  }

  private generateBackupKey(file: FileEntity, strategy: BackupStrategy, variant?: string): string {
    const timestamp = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const basePath = `backups/${strategy.name}/${timestamp}`

    if (variant) {
      return `${basePath}/${file.userId}/${variant}_${file.id}_${file.fileName}`
    }

    return `${basePath}/${file.userId}/${file.id}_${file.fileName}`
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname.substring(1) // Remove leading slash
    } catch {
      return null
    }
  }

  async restoreFile(fileId: string, backupDate: string): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } })
    if (!file) {
      throw new Error("File not found")
    }

    // Find backup file
    const backupKey = `backups/daily_hot/${backupDate}/${file.userId}/${file.id}_${file.fileName}`

    try {
      // Copy backup back to main location
      await this.storageService.copyFile(backupKey, file.storageKey)
      this.logger.log(`File ${fileId} restored from backup ${backupDate}`)
    } catch (error) {
      this.logger.error(`Failed to restore file ${fileId} from backup:`, error)
      throw error
    }
  }

  async listBackups(userId: string): Promise<
    Array<{
      fileId: string
      fileName: string
      backupDate: string
      strategy: string
    }>
  > {
    // This would query the storage service to list available backups
    // For now, return empty array
    return []
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async optimizeStorage(): Promise<void> {
    this.logger.log("Starting storage optimization...")

    try {
      // Move old files to cheaper storage tiers
      const oldFiles = await this.fileRepository
        .createQueryBuilder("file")
        .where("file.createdAt <= :thirtyDaysAgo", {
          thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        })
        .andWhere("file.storageTier = :hotTier", { hotTier: StorageTier.HOT })
        .andWhere("file.downloadCount < :lowUsage", { lowUsage: 5 })
        .getMany()

      for (const file of oldFiles) {
        try {
          await this.storageService.changeStorageTier(file.storageKey, StorageTier.WARM)
          file.storageTier = StorageTier.WARM
          await this.fileRepository.save(file)
        } catch (error) {
          this.logger.error(`Failed to optimize storage for file ${file.id}:`, error)
        }
      }

      // Move very old files to cold storage
      const veryOldFiles = await this.fileRepository
        .createQueryBuilder("file")
        .where("file.createdAt <= :ninetyDaysAgo", {
          ninetyDaysAgo: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        })
        .andWhere("file.storageTier = :warmTier", { warmTier: StorageTier.WARM })
        .andWhere("file.downloadCount < :veryLowUsage", { veryLowUsage: 2 })
        .getMany()

      for (const file of veryOldFiles) {
        try {
          await this.storageService.changeStorageTier(file.storageKey, StorageTier.COLD)
          file.storageTier = StorageTier.COLD
          await this.fileRepository.save(file)
        } catch (error) {
          this.logger.error(`Failed to move file ${file.id} to cold storage:`, error)
        }
      }

      this.logger.log("Storage optimization completed")
    } catch (error) {
      this.logger.error("Storage optimization failed:", error)
    }
  }
}
