import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { AchievementNotification } from './entities/achievement-notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Achievement,
      UserAchievement,
      AchievementNotification
    ])
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService]
})
export class AchievementsModule {}
