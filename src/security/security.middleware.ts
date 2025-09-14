import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import xss from 'xss-clean';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { RequestHandler } from 'express';
import { SecurityConfigService } from '../services/security-config.service';
import { SecurityAuditService } from '../services/security-audit.service';

export function helmetMiddleware(): RequestHandler {
  // We enable common security headers via helmet and a conservative contentSecurityPolicy
  return helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    } as any,
  } as any);
}

export function corsMiddleware(securityConfig: SecurityConfigService) {
  return cors({
    origin: (origin, cb) => {
      // allow if origin is in whitelist or if no origin (curl, mobile)
      if (!origin) return cb(null, true);
      if (securityConfig.CORS_ALLOWED_ORIGINS.indexOf(origin) !== -1) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
}

export function rateLimiterMiddleware(securityConfig: SecurityConfigService, auditService?: SecurityAuditService) {
  const opts: any = {
    windowMs: securityConfig.RATE_LIMIT_WINDOW_MS,
    max: securityConfig.RATE_LIMIT_MAX,
    legacyHeaders: false,
    standardHeaders: true,
    handler: (req, res) => {
      // log
      if (auditService) {
        auditService.log('rate_limit_trigger', req.ip, req.headers['user-agent'] as string, { path: req.path });
      }
      res.status(429).json({ message: 'Too many requests' });
    },
  };

  // If REDIS_URL specified, use Redis store (recommended in prod with multiple instances)
  if (securityConfig.REDIS_URL) {
    const client = new Redis(securityConfig.REDIS_URL);
    opts.store = new RedisStore({
      sendCommand: (...args: any[]) => client.call(...args),
    });
  }

  return rateLimit(opts);
}

export function sanitizationMiddlewares() {
  return [xss(), mongoSanitize(), hpp()];
}

export function sessionMiddleware(securityConfig: SecurityConfigService) {
  const RedisStoreConnect = connectRedis(session as any);
  let store: any = undefined;

  if (securityConfig.REDIS_URL) {
    const client = new Redis(securityConfig.REDIS_URL);
    store = new RedisStoreConnect({ client });
  }

  return session({
    name: 'sid',
    secret: securityConfig.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: securityConfig.SESSION_COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  });
}
