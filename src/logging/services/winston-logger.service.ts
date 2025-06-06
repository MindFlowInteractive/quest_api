import { Injectable, Scope } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as winston from "winston"
import * as DailyRotateFile from "winston-daily-rotate-file"
import type { ILogger } from "../interfaces/logger.interface"
import type { LogContext, ErrorContext } from "../../common/types/logging.types"
import { MAX_LOG_FILE_SIZE, MAX_LOG_FILES } from "../../common/constants/logging.constants"

@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLoggerService implements ILogger {
  private logger: winston.Logger
  private context: LogContext = { correlationId: "" }

  constructor(private configService: ConfigService) {
    this.initializeLogger()
  }

  private initializeLogger(): void {
    const logLevel = this.configService.get<string>("LOG_LEVEL", "info")
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development")

    const transports: winston.transport[] = []

    // Console transport for development
    if (nodeEnv === "development") {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level}]: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
              }`
            }),
          ),
        }),
      )
    }

    // File transports with rotation
    const fileTransportOptions = {
      datePattern: "YYYY-MM-DD",
      maxSize: MAX_LOG_FILE_SIZE,
      maxFiles: MAX_LOG_FILES,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }

    transports.push(
      new DailyRotateFile({
        filename: "logs/application-%DATE%.log",
        level: "info",
        ...fileTransportOptions,
      }),
      new DailyRotateFile({
        filename: "logs/error-%DATE%.log",
        level: "error",
        ...fileTransportOptions,
      }),
    )

    // Production-specific transports
    if (nodeEnv === "production") {
      // Add external logging service transport (e.g., CloudWatch, ELK)
      // This is a placeholder - implement based on your infrastructure
      transports.push(
        new winston.transports.Http({
          host: this.configService.get<string>("LOG_AGGREGATION_HOST"),
          port: this.configService.get<number>("LOG_AGGREGATION_PORT"),
          path: "/logs",
        }),
      )
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
      exitOnError: false,
    })
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context }
  }

  error(message: string, context?: ErrorContext): void {
    this.logger.error(message, { ...this.context, ...context })
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, { ...this.context, ...context })
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, { ...this.context, ...context })
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, { ...this.context, ...context })
  }

  verbose(message: string, context?: LogContext): void {
    this.logger.verbose(message, { ...this.context, ...context })
  }
}
