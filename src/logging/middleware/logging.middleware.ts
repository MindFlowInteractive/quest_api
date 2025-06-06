import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"
import { v4 as uuidv4 } from "uuid"
import type { WinstonLoggerService } from "../services/winston-logger.service"
import type { MetricsCollectorService } from "../services/metrics-collector.service"
import type { ErrorTrackingService } from "../services/error-tracking.service"
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from "../../common/constants/logging.constants"

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    private logger: WinstonLoggerService,
    private metricsCollector: MetricsCollectorService,
    private errorTracker: ErrorTrackingService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now()

    // Generate or extract correlation ID
    const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) || uuidv4()
    const requestId = uuidv4()

    // Set headers
    req.headers[CORRELATION_ID_HEADER] = correlationId
    req.headers[REQUEST_ID_HEADER] = requestId
    res.setHeader(CORRELATION_ID_HEADER, correlationId)
    res.setHeader(REQUEST_ID_HEADER, requestId)

    // Set logging context
    const context = {
      correlationId,
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get("User-Agent"),
      ip: req.ip || req.connection.remoteAddress,
    }

    this.logger.setContext(context)

    // Log incoming request
    this.logger.info("Incoming request", {
      ...context,
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params,
    })

    // Override res.end to capture response
    const originalEnd = res.end
    res.end = function (chunk?: any, encoding?: any) {
      const responseTime = Date.now() - startTime
      const statusCode = res.statusCode

      // Log outgoing response
      const responseContext = {
        ...context,
        statusCode,
        responseTime,
      }

      if (statusCode >= 400) {
        this.logger.error("Request failed", responseContext)
        this.errorTracker.trackError(new Error(`HTTP ${statusCode}`), responseContext)
      } else {
        this.logger.info("Request completed", responseContext)
        this.errorTracker.trackSuccess()
      }

      // Record metrics
      this.metricsCollector.incrementCounter("http_requests_total", {
        method: req.method,
        route: req.route?.path || req.url,
        status_code: statusCode.toString(),
      })

      this.metricsCollector.recordHistogram("http_request_duration_seconds", responseTime / 1000, {
        method: req.method,
        route: req.route?.path || req.url,
        status_code: statusCode.toString(),
      })

      originalEnd.call(this, chunk, encoding)
    }.bind(this)

    next()
  }

  private sanitizeBody(body: any): any {
    if (!body) return body

    const sensitiveFields = ["password", "token", "secret", "key", "authorization"]
    const sanitized = { ...body }

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]"
      }
    }

    return sanitized
  }
}
