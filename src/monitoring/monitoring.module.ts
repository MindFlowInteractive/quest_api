import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PerformanceMonitorService } from "./services/performance-monitor.service"
import { MonitoringController } from "./controllers/monitoring.controller"
import { LoggingModule } from "../logging/logging.module"

@Module({
  imports: [ConfigModule, LoggingModule],
  providers: [PerformanceMonitorService],
  controllers: [MonitoringController],
  exports: [PerformanceMonitorService],
})
export class MonitoringModule {}
