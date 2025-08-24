import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { UnlockableContentService } from "./unlockable-content.service"

@Injectable()
export class ContentSchedulerService {
  private readonly logger = new Logger(ContentSchedulerService.name)

  constructor(private readonly unlockableContentService: UnlockableContentService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleContentExpiration(): Promise<void> {
    this.logger.log("Running content expiration check...")
    try {
      const expiredCount = await this.unlockableContentService.expireContent()
      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} content items`)
      }
    } catch (error) {
      this.logger.error("Failed to expire content", error)
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyContentStats(): Promise<void> {
    this.logger.log("Generating daily content statistics...")
    try {
      const stats = await this.unlockableContentService.getContentStats()
      this.logger.log("Daily content stats:", stats)
    } catch (error) {
      this.logger.error("Failed to generate content stats", error)
    }
  }
}
