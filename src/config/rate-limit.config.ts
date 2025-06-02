import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { Request } from 'express';

export const getRateLimitConfig = (): ThrottlerModuleOptions => ({
  throttlers: [
    {
      ttl: 60000, // 1 minute window in milliseconds
      limit: 100, // default limit
    },
  ],
  skipIf: (context) => {
    const req = context.switchToHttp().getRequest<Request>();
    return req.ip === '127.0.0.1'; // skip localhost
  },
});

export const endpointLimits = {
  auth: {
    login: { ttl: 300000, limit: 5 }, // 5 attempts per 5 minutes
    register: { ttl: 3600000, limit: 3 }, // 3 attempts per hour
  },
  puzzles: {
    generate: { ttl: 60000, limit: 10 }, // 10 puzzles per minute
    solve: { ttl: 30000, limit: 20 }, // 20 solve attempts per 30 seconds
  },
  user: {
    profile: { ttl: 60000, limit: 30 }, // 30 requests per minute
  },
  default: { ttl: 60000, limit: 100 }, // default fallback
};
