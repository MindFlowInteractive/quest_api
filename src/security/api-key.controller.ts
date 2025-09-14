import { Controller, Post, Body, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { SecurityAuditService } from '../services/security-audit.service';

@Controller('internal/api-keys')
export class ApiKeyController {
  constructor(private svc: ApiKeyService, private audit: SecurityAuditService) {}

  // Create key - in prod restrict to admin users / service accounts
  @Post()
  async create(@Body() body: { owner: string; ttlDays?: number }, @Req() req) {
    const { owner, ttlDays } = body;
    const { rawKey, id, expiresAt } = await this.svc.createApiKey(owner, ttlDays);
    this.audit.log('api_key_created', req.ip, req.headers['user-agent'] as string, { owner, id, expiresAt });
    // Return rawKey (display once)
    return { id, rawKey, expiresAt };
  }

  @Delete(':id')
  async revoke(@Param('id') id: string, @Req() req) {
    await this.svc.revokeApiKey(id);
    this.audit.log('api_key_revoked', req.ip, req.headers['user-agent'] as string, { id });
    return { ok: true };
  }
}
