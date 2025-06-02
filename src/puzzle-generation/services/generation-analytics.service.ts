import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationMetrics } from '../entities/generation-metrics.entity';

@Injectable()
export class GenerationAnalyticsService {
  constructor(
    @InjectRepository(GenerationMetrics)
    private metricsRepository: Repository<GenerationMetrics>
  ) {}

  async getSuccessRates(timeRange: Date[]): Promise<any> {
    const [start, end] = timeRange;
    
    const metrics = await this.metricsRepository
      .createQueryBuilder('metrics')
      .where('metrics.createdAt BETWEEN :start AND :end', { start, end })
      .getMany();

    return {
      overall: this.calculateSuccessRate(metrics),
      byType: this.calculateSuccessRateByType(metrics),
      byDifficulty: this.calculateSuccessRateByDifficulty(metrics)
    };
  }

  async getPerformanceMetrics(): Promise<any> {
    const recentMetrics = await this.metricsRepository
      .createQueryBuilder('metrics')
      .where('metrics.createdAt > :date', { 
        date: new Date(Date.now() - 24 * 60 * 60 * 1000) 
      })
      .getMany();

    return {
      averageGenerationTime: this.calculateAverage(recentMetrics, 'generationTime'),
      averageQualityScore: this.calculateAverage(recentMetrics, 'qualityScore'),
      totalGenerated: recentMetrics.length,
      successRate: this.calculateSuccessRate(recentMetrics)
    };
  }

  async getQualityTrends(days: number): Promise<any> {
    const metrics = await this.metricsRepository
      .createQueryBuilder('metrics')
      .where('metrics.createdAt > :date', { 
        date: new Date(Date.now() - days * 24 * 60 * 60 * 1000) 
      })
      .orderBy('metrics.createdAt', 'ASC')
      .getMany();

    return this.groupByDay(metrics);
  }

  private calculateSuccessRate(metrics: GenerationMetrics[]): number {
    if (metrics.length === 0) return 0;
    const successful = metrics.filter(m => m.qualityScore >= 0.7).length;
    return successful / metrics.length;
  }

  private calculateSuccessRateByType(metrics: GenerationMetrics[]): any {
    const byType = this.groupBy(metrics, 'puzzleType');
    const result = {};
    
    for (const [type, typeMetrics] of Object.entries(byType)) {
      result[type] = this.calculateSuccessRate(typeMetrics as GenerationMetrics[]);
    }
    
    return result;
  }

  private calculateSuccessRateByDifficulty(metrics: GenerationMetrics[]): any {
    const byDifficulty = this.groupBy(metrics, 'difficulty');
    const result = {};
    
    for (const [difficulty, difficultyMetrics] of Object.entries(byDifficulty)) {
      result[difficulty] = this.calculateSuccessRate(difficultyMetrics as GenerationMetrics[]);
    }
    
    return result;
  }

  private calculateAverage(metrics: GenerationMetrics[], field: string): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + (m[field] || 0), 0);
    return sum / metrics.length;
  }

  private groupBy(array: any[], key: string): any {
    return array.reduce((groups, item) => {
      const value = item[key];
      (groups[value] = groups[value] || []).push(item);
      return groups;
    }, {});
  }

  private groupByDay(metrics: GenerationMetrics[]): any {
    const grouped = {};
    
    metrics.forEach(metric => {
      const day = metric.createdAt.toISOString().split('T')[0];
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(metric);
    });

    const result = {};
    for (const [day, dayMetrics] of Object.entries(grouped)) {
      result[day] = {
        count: (dayMetrics as GenerationMetrics[]).length,
        averageQuality: this.calculateAverage(dayMetrics as GenerationMetrics[], 'qualityScore'),
        averageTime: this.calculateAverage(dayMetrics as GenerationMetrics[], 'generationTime')
      };
    }

    return result;
  }
}