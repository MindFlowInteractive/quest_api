import type { LogContext, ErrorContext } from "../../common/types/logging.types"

export interface ILogger {
  error(message: string, context?: ErrorContext): void
  warn(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  debug(message: string, context?: LogContext): void
  verbose(message: string, context?: LogContext): void
}

export interface IMetricsCollector {
  incrementCounter(name: string, labels?: Record<string, string>): void
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void
  setGauge(name: string, value: number, labels?: Record<string, string>): void
  getMetrics(): Promise<string>
}
