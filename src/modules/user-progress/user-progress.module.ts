import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { UserProgressController } from './user-progress.controller';
import { UserProgressService } from './user-progress.service';
import { UserProgress } from './entities/user-progress.entity';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { ProgressSnapshot } from './entities/progress-snapshot.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProgress,
      Achievement,
      UserAchievement,
      ProgressSnapshot,
      User,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [UserProgressController],
  providers: [UserProgressService],
  exports: [UserProgressService, TypeOrmModule],
})
export class UserProgressModule {}
