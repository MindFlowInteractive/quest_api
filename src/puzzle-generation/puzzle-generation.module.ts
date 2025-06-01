import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PuzzleGenerationService } from './services/puzzle-generation.service';
import { DifficultyService } from './services/difficulty.service';
import { QualityAssessmentService } from './services/quality-assessment.service';
import { GenerationAnalyticsService } from './services/generation-analytics.service';
import { CacheOptimizationService } from './services/cache-optimization.service';
import { ABTestingService } from './services/ab-testing.service';
import { PuzzleGenerationController } from './controllers/puzzle-generation.controller';
import { GenerationMetrics } from './entities/generation-metrics.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { ABTestConfig } from './entities/ab-test-config.entity';

@Module({
  imports: [
    ConfigModule,
    CacheModule.register({
      ttl: 600, // 10 minutes
      max: 1000, // Maximum number of items in cache
    }),
    TypeOrmModule.forFeature([GenerationMetrics, UserPreferences, ABTestConfig]),
  ],
  controllers: [PuzzleGenerationController],
  providers: [
    PuzzleGenerationService,
    DifficultyService,
    QualityAssessmentService,
    GenerationAnalyticsService,
    CacheOptimizationService,
    ABTestingService,
  ],
  exports: [PuzzleGenerationService],
})
export class PuzzleGenerationModule {}
