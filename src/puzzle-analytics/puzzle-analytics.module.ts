import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { PuzzleAnalytics } from "./entities/puzzle-analytics.entity"
import { PuzzleAnalyticsService } from "./services/puzzle-analytics.service"
import { PuzzleAnalyticsController } from "./controllers/puzzle-analytics.controller"

@Module({
  imports: [TypeOrmModule.forFeature([PuzzleAnalytics])],
  controllers: [PuzzleAnalyticsController],
  providers: [PuzzleAnalyticsService],
  exports: [PuzzleAnalyticsService], // Export service for use in other modules
})
export class PuzzleAnalyticsModule {}
