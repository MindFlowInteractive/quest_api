import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from './services/api-key.service';
import { AbuseDetectionService } from './services/abuse-detection.service';
import { MonitoringService } from './services/monitoring.service';
import { RequestValidationService } from './services/request-validation.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly abuseDetectionService: AbuseDetectionService,
    private readonly monitoringService: MonitoringService,
    private readonly requestValidationService: RequestValidationService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const apiKey = req.header('x-api-key');
    const ip = req.ip;
    const endpoint = req.path;

    try {
      // Check for API key if required
      if (this.requiresApiKey(endpoint)) {
        await this.apiKeyService.validateApiKey(apiKey, ip, endpoint);
      }

      // Validate endpoint format
      if (!this.requestValidationService.validateEndpoint(endpoint)) {
        throw new HttpException('Invalid endpoint format', HttpStatus.BAD_REQUEST);
      }

      // Check for abuse
      const isAbusive = await this.abuseDetectionService.detectAbuse(ip, endpoint);
      if (isAbusive) {
        throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
      }

      // Continue with the request
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.monitoringService.logRequest({
          endpoint,
          method: req.method,
          ip,
          apiKeyId: apiKey,
          responseTime,
          statusCode: res.statusCode,
          headers: req.headers as Record<string, string>,
        });
      });

      next();
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      await this.monitoringService.logRequest({
        endpoint,
        method: req.method,
        ip,
        apiKeyId: apiKey,
        responseTime: Date.now() - startTime,
        statusCode,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  private requiresApiKey(endpoint: string): boolean {
    // Add your logic to determine which endpoints require API key
    const publicEndpoints = ['/api/v1/auth/login', '/api/v1/auth/register'];
    return !publicEndpoints.includes(endpoint);
  }
}
