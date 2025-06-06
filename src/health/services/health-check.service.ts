import { Injectable } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { InjectDataSource } from "@nestjs/typeorm"
import type { DataSource } from "typeorm"
import type { WinstonLoggerService } from "../../logging/services/winston-logger.service"
import type { HealthCheckResult } from "../../common/types/logging.types"
import { HEALTH_CHECK_TIMEOUT } from "../../common/constants/logging.constants"

@Injectable()
export class HealthCheckService {
  constructor(
    private dataSource: DataSource,
    private logger: WinstonLoggerService,
    private configService: ConfigService,
    @InjectDataSource() private readonly injectedDataSource: DataSource,
  ) {}

  async checkOverallHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkMemory(),
      this.checkDiskSpace(),
      this.checkExternalServices(),
    ])

    const results = checks.map((check, index) => ({
      name: ["database", "memory", "disk", "external"][index],
      status: check.status === "fulfilled" ? check.value.status : "unhealthy",
      details: check.status === "fulfilled" ? check.value.details : { error: check.reason },
    }))

    const overallStatus = results.every((r) => r.status === "healthy")
      ? "healthy"
      : results.some((r) => r.status === "healthy")
        ? "degraded"
        : "unhealthy"

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      details: {
        checks: results,
        version: process.env.npm_package_version || "1.0.0",
        uptime: process.uptime(),
        environment: this.configService.get("NODE_ENV"),
      },
    }

    this.logger.info("Health check completed", { result })
    return result
  }

  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      await Promise.race([
        this.dataSource.query("SELECT 1"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Database timeout")), HEALTH_CHECK_TIMEOUT)),
      ])

      const connectionCount = this.dataSource.isInitialized ? 1 : 0

      return {
        status: "healthy",
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          connected: this.dataSource.isInitialized,
          connectionCount,
          database: this.dataSource.options.database,
        },
      }
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          error: error.message,
          connected: false,
        },
      }
    }
  }

  async checkMemory(): Promise<HealthCheckResult> {
    const memUsage = process.memoryUsage()
    const totalMemory = require("os").totalmem()
    const freeMemory = require("os").freemem()
    const usedMemory = totalMemory - freeMemory
    const memoryUsagePercent = usedMemory / totalMemory

    const status = memoryUsagePercent > 0.9 ? "unhealthy" : memoryUsagePercent > 0.7 ? "degraded" : "healthy"

    return {
      status,
      timestamp: new Date(),
      responseTime: 0,
      details: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        systemMemoryUsage: memoryUsagePercent,
        totalMemory,
        freeMemory,
      },
    }
  }

  async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      const fs = require("fs")
      const stats = fs.statSync(".")

      // This is a simplified check - in production, you'd want to check actual disk usage
      return {
        status: "healthy",
        timestamp: new Date(),
        responseTime: 0,
        details: {
          available: true,
          path: process.cwd(),
        },
      }
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        responseTime: 0,
        details: {
          error: error.message,
        },
      }
    }
  }

  async checkExternalServices(): Promise<HealthCheckResult> {
    const externalServices = this.configService.get<string[]>("EXTERNAL_SERVICES", [])

    if (externalServices.length === 0) {
      return {
        status: "healthy",
        timestamp: new Date(),
        responseTime: 0,
        details: { message: "No external services configured" },
      }
    }

    const checks = await Promise.allSettled(externalServices.map((service) => this.pingService(service)))

    const healthyServices = checks.filter((check) => check.status === "fulfilled").length
    const status =
      healthyServices === externalServices.length ? "healthy" : healthyServices > 0 ? "degraded" : "unhealthy"

    return {
      status,
      timestamp: new Date(),
      responseTime: 0,
      details: {
        totalServices: externalServices.length,
        healthyServices,
        services: externalServices.map((service, index) => ({
          name: service,
          status: checks[index].status === "fulfilled" ? "healthy" : "unhealthy",
        })),
      },
    }
  }

  private async pingService(serviceUrl: string): Promise<boolean> {
    try {
      const response = await fetch(serviceUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
