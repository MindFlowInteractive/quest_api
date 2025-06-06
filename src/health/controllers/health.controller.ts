import { Controller, Get } from "@nestjs/common"
import type { HealthCheckService } from "../services/health-check.service"
import type { MetricsCollectorService } from "../../logging/services/metrics-collector.service"
import type { ErrorTrackingService } from "../../logging/services/error-tracking.service"

@Controller("health")
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private metricsCollector: MetricsCollectorService,
    private errorTracker: ErrorTrackingService,
  ) {}

  @Get()
  async getHealth() {
    return this.healthCheckService.checkOverallHealth()
  }

  @Get("database")
  async getDatabaseHealth() {
    return this.healthCheckService.checkDatabase()
  }

  @Get("memory")
  async getMemoryHealth() {
    return this.healthCheckService.checkMemory()
  }

  @Get("metrics")
  async getMetrics() {
    const metrics = await this.metricsCollector.getMetrics()
    return {
      metrics,
      contentType: "text/plain",
    }
  }

  @Get("errors")
  async getErrorStatistics() {
    return this.errorTracker.getErrorStatistics()
  }

  @Get("liveness")
  async getLiveness() {
    return {
      status: "alive",
      timestamp: new Date(),
      uptime: process.uptime(),
    }
  }

  @Get("readiness")
  async getReadiness() {
    const dbHealth = await this.healthCheckService.checkDatabase()
    return {
      status: dbHealth.status === "healthy" ? "ready" : "not ready",
      timestamp: new Date(),
      details: dbHealth.details,
    }
  }
}
