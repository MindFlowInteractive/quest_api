import { Module, Global } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { WinstonLoggerService } from "./services/winston-logger.service"
import { MetricsCollectorService } from "./services/metrics-collector.service"
import { ErrorTrackingService } from "./services/error-tracking.service"
import { AlertingService } from "./services/alerting.service"
import { LoggingMiddleware } from "./middleware/logging.middleware"
import { LoggingInterceptor } from "./interceptors/logging.interceptor"

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    WinstonLoggerService,
    MetricsCollectorService,
    ErrorTrackingService,
    AlertingService,
    LoggingMiddleware,
    LoggingInterceptor,
  ],
  exports: [
    WinstonLoggerService,
    MetricsCollectorService,
    ErrorTrackingService,
    AlertingService,
    LoggingMiddleware,
    LoggingInterceptor,
  ],
})
export class LoggingModule {}
