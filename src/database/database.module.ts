import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Achievement } from '@/achievement/entities/achievement.entity';
import { UserAchievement } from '@/achievement/entities/user-achievement.entity';
import { GameSession } from '@/game-session/entities/game-session.entity';
import { PuzzleProgress } from '@/puzzle/entities/puzzle-progress.entity';
import { Puzzle } from '@/puzzle/entities/puzzle.entity';
import { User } from '@/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'game_db'),
        entities: [
          User,
          Puzzle,
          PuzzleProgress,
          Achievement,
          UserAchievement,
          GameSession,
        ],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: configService.get('NODE_ENV') !== 'production',
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
