import { Injectable } from '@nestjs/common';

@Injectable()
export class SecurityConfigService {
  NODE_ENV = process.env.NODE_ENV || 'development';
  RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100; // per window
  RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
  TRUST_PROXY = process.env.TRUST_PROXY === 'true';
  CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  SESSION_SECRET = process.env.SESSION_SECRET || 'change_this_to_strong_secret';
  SESSION_COOKIE_SECURE = this.NODE_ENV === 'production';
  REDIS_URL = process.env.REDIS_URL || '';
  API_KEY_TTL_DAYS = Number(process.env.API_KEY_TTL_DAYS) || 365;
}
