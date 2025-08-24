import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule } from "@nestjs/schedule"
import { Achievement, UserAchievement, UnlockableContent, UserUnlockedContent } from "./entities"
import {
  AchievementService,
  AchievementSeederService,
  UnlockableContentService,
  ContentSchedulerService,
  ContentValidationService,
} from "./services"
import { AchievementController, AdminAchievementController } from "./controllers"

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement, UnlockableContent, UserUnlockedContent]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AchievementController, AdminAchievementController],
  providers: [
    AchievementService,
    AchievementSeederService,
    UnlockableContentService,
    ContentSchedulerService,
    ContentValidationService,
  ],
  exports: [AchievementService, UnlockableContentService, AchievementSeederService],
})
export class AchievementModule {}
