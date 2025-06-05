import { Module } from '@nestjs/common';
import { PuzzleEngineService } from './puzzle-engine.service';
import { PuzzleDifficultyService } from './puzzle-difficulty.service';
import { PuzzleSequenceService } from './puzzle-sequence.service';
import { PuzzleHintService } from './puzzle-hint.service';
import { PuzzleAnalyticsService } from './puzzle-analytics.service';
import { PuzzlePersistenceService } from './puzzle-persistence.service';
import { PuzzleProgressionService } from './puzzle-progression.service';

@Module({
  providers: [
    PuzzleEngineService,
    PuzzleDifficultyService,
    PuzzleSequenceService,
    PuzzleHintService,
    PuzzleAnalyticsService,
    PuzzlePersistenceService,
    PuzzleProgressionService,
  ],
  exports: [
    PuzzleEngineService,
    PuzzleDifficultyService,
    PuzzleSequenceService,
    PuzzleHintService,
    PuzzleAnalyticsService,
    PuzzlePersistenceService,
    PuzzleProgressionService,
  ],
})
export class GameEngineModule {}
