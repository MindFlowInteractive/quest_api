import { Controller, Get, Query } from "@nestjs/common"
import type { PerformanceMonitorService } from "../services/performance-monitor.service"

@Controller("monitoring")
export class MonitoringController {
  constructor(private performanceMonitor: PerformanceMonitorService) {}

  @Get('performance')
  getPerformanceMetrics(@Query('limit') limit: string) {
    const limitNum = limit ? Number.parseInt(limit, 10) : undefined;
    return {
      current: this.performanceMonitor.getCurrentMetrics(),
      history: this.performanceMonitor.getPerformanceHistory(limitNum)
    };
  }

  @Get("dashboard")
  getDashboardData() {
    const current = this.performanceMonitor.getCurrentMetrics()
    const history = this.performanceMonitor.getPerformanceHistory(100)

    return {
      current,
      trends: {
        memoryUsage: history.map((h) => ({
          timestamp: h.timestamp,
          value: h.memoryUsage.heapUsed / h.memoryUsage.heapTotal,
        })),
        responseTime: history.map((h) => ({
          timestamp: h.timestamp,
          value: h.responseTime,
        })),
      },
      summary: {
        averageMemoryUsage:
          history.reduce((sum, h) => sum + h.memoryUsage.heapUsed / h.memoryUsage.heapTotal, 0) / history.length,
        averageResponseTime: history.reduce((sum, h) => sum + h.responseTime, 0) / history.length,
        dataPoints: history.length,
      },
    }
  }
}
