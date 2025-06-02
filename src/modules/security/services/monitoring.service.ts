import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestLog } from '../entities/request-log.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(RequestLog)
    private requestLogRepository: Repository<RequestLog>,
  ) {}

  async logRequest(data: Partial<RequestLog>): Promise<RequestLog> {
    const log = this.requestLogRepository.create(data);
    return this.requestLogRepository.save(log);
  }

  async getEndpointMetrics(timeWindow: number = 3600): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow * 1000);

    return this.requestLogRepository
      .createQueryBuilder('log')
      .select('endpoint')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('AVG(responseTime)', 'avgResponseTime')
      .addSelect('COUNT(CASE WHEN statusCode >= 400 THEN 1 END)', 'errorCount')
      .where('log.createdAt BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      })
      .groupBy('endpoint')
      .getRawMany();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generateHourlyReport(): Promise<void> {
    const metrics = await this.getEndpointMetrics(3600);
    // Here you could send this data to a monitoring service
    // or store it in a separate analytics database
    console.log('Hourly API Metrics:', metrics);
  }

  async getSlowEndpoints(threshold: number = 1000): Promise<any> {
    return this.requestLogRepository
      .createQueryBuilder('log')
      .select('endpoint')
      .addSelect('AVG(responseTime)', 'avgResponseTime')
      .addSelect('COUNT(*)', 'requestCount')
      .groupBy('endpoint')
      .having('AVG(responseTime) > :threshold', { threshold })
      .orderBy('avgResponseTime', 'DESC')
      .getRawMany();
  }

  async getErrorRates(): Promise<any> {
    const oneHourAgo = new Date(Date.now() - 3600000);

    return this.requestLogRepository
      .createQueryBuilder('log')
      .select('endpoint')
      .addSelect('COUNT(*)', 'totalRequests')
      .addSelect(
        'COUNT(CASE WHEN statusCode >= 400 THEN 1 END)',
        'errorCount',
      )
      .addSelect(
        'CAST(COUNT(CASE WHEN statusCode >= 400 THEN 1 END) AS FLOAT) / COUNT(*) * 100',
        'errorRate',
      )
      .where('log.createdAt > :oneHourAgo', { oneHourAgo })
      .groupBy('endpoint')
      .having('COUNT(*) > 10') // Only show endpoints with significant traffic
      .orderBy('errorRate', 'DESC')
      .getRawMany();
  }
}
