import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async createApiKey(name: string, options: Partial<ApiKey> = {}): Promise<ApiKey> {
    const key = this.generateApiKey();
    const apiKey = this.apiKeyRepository.create({
      name,
      key,
      isActive: true,
      allowedIps: options.allowedIps || [],
      allowedEndpoints: options.allowedEndpoints || [],
      rateLimit: options.rateLimit || 1000,
      expiresAt: options.expiresAt,
    });

    return this.apiKeyRepository.save(apiKey);
  }

  async validateApiKey(key: string, ip: string, endpoint: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { key, isActive: true } });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    if (apiKey.allowedIps.length > 0 && !apiKey.allowedIps.includes(ip)) {
      throw new UnauthorizedException('IP not allowed');
    }

    if (apiKey.allowedEndpoints.length > 0 && !this.isEndpointAllowed(endpoint, apiKey.allowedEndpoints)) {
      throw new UnauthorizedException('Endpoint not allowed');
    }

    return apiKey;
  }

  private generateApiKey(): string {
    return `lq_${crypto.randomBytes(32).toString('hex')}`;
  }

  private isEndpointAllowed(endpoint: string, allowedEndpoints: string[]): boolean {
    return allowedEndpoints.some(pattern => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(endpoint);
    });
  }
}
