import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { UserActivity } from './entities/user-activity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserPreferences,
      UserAchievement,
      UserActivity,
    ]),
    MulterModule.register({
      dest: './uploads/avatars',
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
