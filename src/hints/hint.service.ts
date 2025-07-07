import { Injectable } from '@nestjs/common';
import { SudokuHintStrategy } from './strategies/sudoku-hint.strategy';
import { InjectRepository } from '@nestjs/typeorm';
import { HintUsage } from './entities/hint.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HintService {
  private strategies = {
    sudoku: new SudokuHintStrategy(),
    // wordle: new WordleHintStrategy(), // extendable
  };

  constructor(
    @InjectRepository(HintUsage)
    private hintRepo: Repository<HintUsage>,
  ) {}

  async generateHint(
    userId: string,
    puzzleId: string,
    puzzleType: string,
    state: any,
  ): Promise<{ hint: string; level: number }> {
    const pastHints = await this.hintRepo.find({
      where: { userId, puzzleId },
      order: { usedAt: 'DESC' },
    });
    const level = pastHints.length + 1;
    const strategy = this.strategies[puzzleType];
    if (!strategy) throw new Error('No strategy found for this puzzle type');

    const hint = strategy.getHint(state, level);
    await this.hintRepo.save({ userId, puzzleId, puzzleType, level, helpful: false });
    return { hint, level };
  }
}
