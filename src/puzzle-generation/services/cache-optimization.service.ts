

// services/cache-optimization.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PuzzleConfig, GeneratedPuzzle } from '../interfaces/puzzle.interface';

@Injectable()
export class CacheOptimizationService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getCachedPuzzle(config: PuzzleConfig): Promise<GeneratedPuzzle | null> {
    const key = this.generateCacheKey(config);
    return await this.cacheManager.get(key);
  }

  async cachePuzzle(config: PuzzleConfig, puzzle: GeneratedPuzzle): Promise<void> {
    const key = this.generateCacheKey(config);
    const ttl = this.calculateTTL(config, puzzle);
    await this.cacheManager.set(key, puzzle, ttl);
  }

  async getRecentPuzzles(type: string, limit: number): Promise<GeneratedPuzzle[]> {
    const key = `recent_${type}`;
    const cached = await this.cacheManager.get<GeneratedPuzzle[]>(key);
    return cached ? cached.slice(0, limit) : [];
  }

  async addToRecentPuzzles(puzzle: GeneratedPuzzle): Promise<void> {
    const key = `recent_${puzzle.type}`;
    const existing = await this.cacheManager.get<GeneratedPuzzle[]>(key) || [];
    
    existing.unshift(puzzle);
    const limited = existing.slice(0, 100); // Keep last 100
    
    await this.cacheManager.set(key, limited, 3600); // 1 hour TTL
  }

  private generateCacheKey(config: PuzzleConfig): string {
    const keyParts = [
      config.type,
      config.difficulty,
      config.size || 'default',
      JSON.stringify(config.constraints || {}),
      config.theme || 'default'
    ];
    
    return `puzzle_${keyParts.join('_')}`;
  }

  private calculateTTL(config: PuzzleConfig, puzzle: GeneratedPuzzle): number {
    // Higher quality puzzles cached longer
    const baseTTL = 600; // 10 minutes
    const qualityMultiplier = puzzle.qualityScore;
    
    // More difficult puzzles cached longer (take more time to generate)
    const difficultyMultiplier = Math.log(config.difficulty + 1);
    
    return Math.floor(baseTTL * qualityMultiplier * difficultyMultiplier);
  }
}
