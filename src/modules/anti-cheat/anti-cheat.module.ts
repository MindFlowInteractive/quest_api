import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AntiCheatController } from './controllers/anti-cheat.controller';
import { AntiCheatValidationService } from './services/anti-cheat-validation.service';
import { AntiCheatDetectionService } from './services/anti-cheat-detection.service';
import { StatisticalAnalysisService } from './services/statistical-analysis.service';
import { ManualReviewService } from './services/manual-review.service';
import { AppealService } from './services/appeal.service';
import { CommunityModerationService } from './services/community-moderation.service';
import { AntiCheatAnalyticsService } from './services/anti-cheat-analytics.service';
import { CheatDetection } from './entities/cheat-detection.entity';
import { ManualReview } from './entities/manual-review.entity';
import { Appeal } from './entities/appeal.entity';
import { CommunityReport } from './entities/community-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheatDetection,
      ManualReview,
      Appeal,
      CommunityReport,
    ]),
  ],
  controllers: [AntiCheatController],
  providers: [
    AntiCheatValidationService,
    AntiCheatDetectionService,
    StatisticalAnalysisService,
    ManualReviewService,
    AppealService,
    CommunityModerationService,
    AntiCheatAnalyticsService,
  ],
  exports: [
    AntiCheatValidationService,
    AntiCheatDetectionService,
    StatisticalAnalysisService,
    ManualReviewService,
    AppealService,
    CommunityModerationService,
    AntiCheatAnalyticsService,
  ],
})
export class AntiCheatModule {}
