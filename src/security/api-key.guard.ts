import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.header('x-api-key') || req.query['api_key'] || null;
    if (!key) throw new UnauthorizedException('Missing API key');

    const valid = await this.apiKeyService.validateRawKey(key);
    if (!valid) throw new UnauthorizedException('Invalid API key');
    // optionally attach owner to req
    (req as any).apiKeyOwner = valid.owner;
    return true;
  }
}
