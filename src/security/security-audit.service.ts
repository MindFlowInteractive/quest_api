import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SecurityAudit } from '../entities/security-audit.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SecurityAuditService {
  constructor(@InjectRepository(SecurityAudit) private repo: Repository<SecurityAudit>) {}

  async log(event: string, ip: string, userAgent: string, meta?: any, userId?: string) {
    const entry = this.repo.create({ event, ip, userAgent, meta, userId });
    return this.repo.save(entry);
  }
}
