import { Injectable } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as promClient from "prom-client"
import type { IMetricsCollector } from "../interfaces/logger.interface"

@Injectable()
export class MetricsCollectorService implements IMetricsCollector {
  private registry: promClient.Registry
  private counters: Map<string, promClient.Counter> = new Map()
  private histograms: Map<string, promClient.Histogram> = new Map()
  private gauges: Map<string, promClient.Gauge> = new Map()

  constructor(private configService: ConfigService) {
    this.registry = new promClient.Registry()
    this.initializeDefaultMetrics()
    this.initializeCustomMetrics()
  }

  private initializeDefaultMetrics(): void {
    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: "nestjs_app_",
    })
  }

  private initializeCustomMetrics(): void {
    // HTTP request metrics
    const httpRequestsTotal = new promClient.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    })

    const httpRequestDuration = new promClient.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    })

    // Database metrics
    const dbConnectionsActive = new promClient.Gauge({
      name: "db_connections_active",
      help: "Number of active database connections",
      registers: [this.registry],
    })

    const dbQueryDuration = new promClient.Histogram({
      name: "db_query_duration_seconds",
      help: "Duration of database queries in seconds",
      labelNames: ["operation", "table"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.registry],
    })

    // Error metrics
    const errorsTotal = new promClient.Counter({
      name: "errors_total",
      help: "Total number of errors",
      labelNames: ["type", "severity"],
      registers: [this.registry],
    })

    // Store metrics for easy access
    this.counters.set("http_requests_total", httpRequestsTotal)
    this.counters.set("errors_total", errorsTotal)
    this.histograms.set("http_request_duration_seconds", httpRequestDuration)
    this.histograms.set("db_query_duration_seconds", dbQueryDuration)
    this.gauges.set("db_connections_active", dbConnectionsActive)
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const counter = this.counters.get(name)
    if (counter) {
      counter.inc(labels)
    }
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.histograms.get(name)
    if (histogram) {
      histogram.observe(labels, value)
    }
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.gauges.get(name)
    if (gauge) {
      gauge.set(labels, value)
    }
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics()
  }

  getRegistry(): promClient.Registry {
    return this.registry
  }
}
