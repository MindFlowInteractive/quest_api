import { Injectable, type OnModuleInit } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { WinstonLoggerService } from "../../logging/services/winston-logger.service"
import type { MetricsCollectorService } from "../../logging/services/metrics-collector.service"
import type { AlertingService } from "../../logging/services/alerting.service"
import { type PerformanceMetrics, AlertSeverity } from "../../common/types/logging.types"
import { METRICS_COLLECTION_INTERVAL, ALERT_THRESHOLDS } from "../../common/constants/logging.constants"

@Injectable()
export class PerformanceMonitorService implements OnModuleInit {
  private monitoringInterval: NodeJS.Timeout
  private performanceHistory: PerformanceMetrics[] = []
  private readonly maxHistorySize = 1000

  constructor(
    private logger: WinstonLoggerService,
    private metricsCollector: MetricsCollectorService,
    private alertingService: AlertingService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.startMonitoring()
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, METRICS_COLLECTION_INTERVAL)

    this.logger.info("Performance monitoring started", {
      interval: METRICS_COLLECTION_INTERVAL,
    })
  }

  private async collectMetrics(): Promise<void> {
    const startTime = Date.now()

    try {
      const metrics: PerformanceMetrics = {
        responseTime: 0, // This would be calculated from actual requests
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        timestamp: new Date(),
      }

      // Store metrics
      this.performanceHistory.push(metrics)
      if (this.performanceHistory.length > this.maxHistorySize) {
        this.performanceHistory.shift()
      }

      // Update Prometheus metrics
      this.metricsCollector.setGauge("memory_usage_bytes", metrics.memoryUsage.heapUsed)
      this.metricsCollector.setGauge(
        "memory_usage_percent",
        metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal,
      )

      // Check for alerts
      await this.checkPerformanceAlerts(metrics)

      this.logger.debug("Performance metrics collected", {
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        collectionTime: Date.now() - startTime,
      })
    } catch (error) {
      this.logger.error("Failed to collect performance metrics", {
        error: error.message,
        stack: error.stack,
      })
    }
  }

  private async checkPerformanceAlerts(metrics: PerformanceMetrics): Promise<void> {
    const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal

    // Memory usage alert
    if (memoryUsagePercent > ALERT_THRESHOLDS.MEMORY_USAGE) {
      await this.alertingService.sendAlert({
        title: "High Memory Usage",
        message: `Memory usage is ${(memoryUsagePercent * 100).toFixed(2)}% (threshold: ${ALERT_THRESHOLDS.MEMORY_USAGE * 100}%)`,
        severity: AlertSeverity.HIGH,
        context: {
          memoryUsage: metrics.memoryUsage,
          threshold: ALERT_THRESHOLDS.MEMORY_USAGE,
        },
      })
    }

    // CPU usage alert (simplified - in production you'd calculate actual CPU percentage)
    const cpuUsagePercent = (metrics.cpuUsage.user + metrics.cpuUsage.system) / 1000000 // Convert to seconds
    if (cpuUsagePercent > ALERT_THRESHOLDS.CPU_USAGE) {
      await this.alertingService.sendAlert({
        title: "High CPU Usage",
        message: `CPU usage is high`,
        severity: AlertSeverity.HIGH,
        context: {
          cpuUsage: metrics.cpuUsage,
          threshold: ALERT_THRESHOLDS.CPU_USAGE,
        },
      })
    }
  }

  getPerformanceHistory(limit?: number): PerformanceMetrics[] {
    const history = this.performanceHistory
    return limit ? history.slice(-limit) : history
  }

  getCurrentMetrics(): PerformanceMetrics {
    return {
      responseTime: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date(),
    }
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.logger.info("Performance monitoring stopped")
    }
  }
}
