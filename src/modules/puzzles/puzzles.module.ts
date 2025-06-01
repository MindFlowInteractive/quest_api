import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PuzzlesService } from './puzzles.service';
import { PuzzlesController } from './puzzles.controller';
import { Puzzle } from './entities/puzzle.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { PuzzleVersion } from './entities/puzzle-version.entity';
import { PuzzleAnalytics } from './entities/puzzle-analytics.entity';
import { PuzzleRating } from './entities/puzzle-rating.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Puzzle,
      Category,
      Tag,
      PuzzleVersion,
      PuzzleAnalytics,
      PuzzleRating,
    ]),
  ],
  controllers: [PuzzlesController],
  providers: [PuzzlesService],
  exports: [PuzzlesService],
})
export class PuzzlesModule {}
