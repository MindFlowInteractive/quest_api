import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Achievement } from '@/achievement/entities/achievement.entity';
import { UserAchievement } from '@/achievement/entities/user-achievement.entity';
import { GameSession } from '@/game-session/entities/game-session.entity';
import { PuzzleProgress } from '@/puzzle/entities/puzzle-progress.entity';
import { Puzzle } from '@/puzzle/entities/puzzle.entity';
import { User } from '@/user/entities/user.entity';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
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
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
