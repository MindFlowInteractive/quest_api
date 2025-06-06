import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { HealthCheckService } from "./services/health-check.service"
import { HealthController } from "./controllers/health.controller"
import { LoggingModule } from "../logging/logging.module"

@Module({
  imports: [ConfigModule, TypeOrmModule, LoggingModule],
  providers: [HealthCheckService],
  controllers: [HealthController],
  exports: [HealthCheckService],
})
export class HealthModule {}
