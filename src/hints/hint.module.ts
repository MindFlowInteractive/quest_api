import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HintController } from './hint.controller';
import { HintService } from './hint.service';
import { HintUsage } from './entities/hint-usage.entity';
import { PuzzleAttempt } from '../puzzles/entities/puzzle-attempt.entity'; // Optional if needed
import { HintStrategyRegistry } from './strategies/hint-strategy.registry';

@Module({
  imports: [
    TypeOrmModule.forFeature([HintUsage]), // Add PuzzleAttempt if needed
  ],
  controllers: [HintController],
  providers: [
    HintService,
    HintStrategyRegistry, // Manages multiple puzzle hint strategies
  ],
  exports: [HintService], // In case other modules need it
})
export class HintModule {}
