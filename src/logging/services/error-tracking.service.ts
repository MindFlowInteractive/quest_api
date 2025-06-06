import { Injectable } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { WinstonLoggerService } from "./winston-logger.service"
import type { MetricsCollectorService } from "./metrics-collector.service"
import type { AlertingService } from "./alerting.service"
import { type ErrorContext, AlertSeverity } from "../../common/types/logging.types"
import { ALERT_THRESHOLDS } from "../../common/constants/logging.constants"

@Injectable()
export class ErrorTrackingService {
  private errorCounts: Map<string, number> = new Map()
  private errorRateWindow: number[] = []
  private readonly windowSize = 100 // Track last 100 requests

  constructor(
    private logger: WinstonLoggerService,
    private metricsCollector: MetricsCollectorService,
    private alertingService: AlertingService,
    private configService: ConfigService,
  ) {}

  async trackError(error: Error, context?: ErrorContext): Promise<void> {
    const errorKey = `${error.name}:${error.message}`
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)

    // Log the error
    this.logger.error(error.message, {
      ...context,
      stack: error.stack,
      errorName: error.name,
      errorCount: currentCount + 1,
    })

    // Update metrics
    this.metricsCollector.incrementCounter("errors_total", {
      type: error.name,
      severity: this.determineSeverity(error).toLowerCase(),
    })

    // Track error rate
    this.updateErrorRate(true)

    // Check if alerting is needed
    await this.checkAlertConditions(error, context)
  }

  trackSuccess(): void {
    this.updateErrorRate(false)
  }

  private updateErrorRate(isError: boolean): void {
    this.errorRateWindow.push(isError ? 1 : 0)
    if (this.errorRateWindow.length > this.windowSize) {
      this.errorRateWindow.shift()
    }
  }

  private getCurrentErrorRate(): number {
    if (this.errorRateWindow.length === 0) return 0
    const errors = this.errorRateWindow.reduce((sum, val) => sum + val, 0)
    return errors / this.errorRateWindow.length
  }

  private determineSeverity(error: Error): AlertSeverity {
    // Determine severity based on error type and context
    if (error.name === "DatabaseError" || error.name === "ConnectionError") {
      return AlertSeverity.CRITICAL
    }
    if (error.name === "ValidationError") {
      return AlertSeverity.LOW
    }
    if (error.name === "UnauthorizedError") {
      return AlertSeverity.MEDIUM
    }
    return AlertSeverity.HIGH
  }

  private async checkAlertConditions(error: Error, context?: ErrorContext): Promise<void> {
    const errorRate = this.getCurrentErrorRate()
    const severity = this.determineSeverity(error)

    // Check error rate threshold
    if (errorRate > ALERT_THRESHOLDS.ERROR_RATE) {
      await this.alertingService.sendAlert({
        title: "High Error Rate Detected",
        message: `Error rate is ${(errorRate * 100).toFixed(2)}% (threshold: ${ALERT_THRESHOLDS.ERROR_RATE * 100}%)`,
        severity: AlertSeverity.CRITICAL,
        context: { errorRate, threshold: ALERT_THRESHOLDS.ERROR_RATE },
      })
    }

    // Check for critical errors
    if (severity === AlertSeverity.CRITICAL) {
      await this.alertingService.sendAlert({
        title: "Critical Error Occurred",
        message: `${error.name}: ${error.message}`,
        severity,
        context: { ...context, stack: error.stack },
      })
    }
  }

  getErrorStatistics(): Record<string, any> {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByType: Object.fromEntries(this.errorCounts),
      currentErrorRate: this.getCurrentErrorRate(),
      windowSize: this.errorRateWindow.length,
    }
  }
}
