import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PlayerBehaviorEntity } from './entities/player-behavior.entity';
import { PuzzlePerformanceEntity } from './entities/puzzle-performance.entity';
import { EngagementEntity } from './entities/engagement.entity';
import { RevenueEntity } from './entities/revenue.entity';
import { ABTestEntity } from './entities/ab-test.entity';
import { EventTrackingEntity } from './entities/event-tracking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerBehaviorEntity,
      PuzzlePerformanceEntity,
      EngagementEntity,
      RevenueEntity,
      ABTestEntity,
      EventTrackingEntity,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
