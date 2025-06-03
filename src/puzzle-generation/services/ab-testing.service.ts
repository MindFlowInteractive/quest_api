import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ABTestConfig } from '../entities/ab-test-config.entity';
import { PuzzleConfig } from '../interfaces/puzzle.interface';

@Injectable()
export class ABTestingService {
  constructor(
    @InjectRepository(ABTestConfig)
    private abTestRepository: Repository<ABTestConfig>
  ) {}

  async getActiveTests(): Promise<ABTestConfig[]> {
    return await this.abTestRepository.find({ where: { isActive: true } });
  }

  async applyABTest(config: PuzzleConfig, userId: string): Promise<PuzzleConfig> {
    const activeTests = await this.getActiveTests();
    
    for (const test of activeTests) {
      if (this.shouldApplyTest(test, userId)) {
        return this.applyTestVariant(config, test, userId);
      }
    }
    
    return config;
  }

  private shouldApplyTest(test: ABTestConfig, userId: string): boolean {
    // Simple hash-based assignment
    const hash = this.hashUserId(userId);
    return (hash % 100) < (test.trafficSplit * 100);
  }

  private applyTestVariant(
    config: PuzzleConfig, 
    test: ABTestConfig, 
    userId: string
  ): PuzzleConfig {
    const variant = this.getUserVariant(test, userId);
    return { ...config, ...variant };
  }

  private getUserVariant(test: ABTestConfig, userId: string): any {
    const hash = this.hashUserId(userId);
    return (hash % 2 === 0) ? test.variantA : test.variantB;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async recordTestResult(
    testName: string, 
    userId: string, 
    variant: string, 
    outcome: any
  ): Promise<void> {
    // Record A/B test results for analysis
    // This would typically go to a separate analytics system
    console.log(`A/B Test Result: ${testName}, User: ${userId}, Variant: ${variant}`, outcome);
  }
}