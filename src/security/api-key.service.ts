import { Injectable, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyService {
  private readonly SALT_ROUNDS = 12;

  constructor(@InjectRepository(ApiKey) private repo: Repository<ApiKey>) {}

  // Creates a new API key; returns rawKey (shown once) and stored entity
  async createApiKey(owner: string, ttlDays = 365) {
    const raw = randomBytes(32).toString('hex'); // 64 hex chars
    const hash = await bcrypt.hash(raw, this.SALT_ROUNDS);
    const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 24 * 3600 * 1000) : null;
    const ent = this.repo.create({ keyHash: hash, owner, expiresAt, active: true });
    await this.repo.save(ent);
    // Return raw to caller — must be copied now.
    return { rawKey: raw, id: ent.id, expiresAt };
  }

  async revokeApiKey(id: string) {
    const found = await this.repo.findOneBy({ id });
    if (!found) throw new BadRequestException('ApiKey not found');
    found.active = false;
    await this.repo.save(found);
    return true;
  }

  async validateRawKey(rawKey: string) {
    // For performance, in prod you'd store fingerprint (sha256) and index it so you can find candidate rows quickly.
    const all = await this.repo.find({ where: { active: true } });
    for (const entry of all) {
      const ok = await bcrypt.compare(rawKey, entry.keyHash);
      if (!ok) continue;
      if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) return null;
      return entry;
    }
    return null;
  }
}
