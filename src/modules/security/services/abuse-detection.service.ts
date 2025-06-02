import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestLog } from '../entities/request-log.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class AbuseDetectionService {
  private readonly ABUSE_THRESHOLD = 100; // requests per minute
  private readonly BLOCK_DURATION = 3600; // 1 hour in seconds

  constructor(
    @InjectRepository(RequestLog)
    private requestLogRepository: Repository<RequestLog>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async detectAbuse(ip: string, endpoint: string): Promise<boolean> {
    const key = `abuse:${ip}:${endpoint}`;
    const isBlocked = await this.cacheManager.get<boolean>(`blocked:${ip}`);
    
    if (isBlocked) {
      return true;
    }

    const count = await this.cacheManager.get<number>(key) || 0;
    await this.cacheManager.set(key, count + 1, 60); // 1 minute TTL

    if (count > this.ABUSE_THRESHOLD) {
      await this.blockIp(ip);
      return true;
    }

    return false;
  }

  async blockIp(ip: string): Promise<void> {
    await this.cacheManager.set(`blocked:${ip}`, true, this.BLOCK_DURATION);
  }

  async unblockIp(ip: string): Promise<void> {
    await this.cacheManager.del(`blocked:${ip}`);
  }

  async getAbuseMetrics(ip: string, timeWindow: number = 3600): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow * 1000);

    return this.requestLogRepository
      .createQueryBuilder('log')
      .select('COUNT(*)', 'requestCount')
      .addSelect('AVG(responseTime)', 'avgResponseTime')
      .addSelect('COUNT(CASE WHEN statusCode >= 400 THEN 1 END)', 'errorCount')
      .where('log.ip = :ip', { ip })
      .andWhere('log.createdAt BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      })
      .getRawOne();
  }
}
