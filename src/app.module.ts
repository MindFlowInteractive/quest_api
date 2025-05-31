import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

// Feature modules
import { PuzzlesModule } from './modules/puzzles/puzzles.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { GameModule } from './modules/game/game.module';
import { UserModule } from './modules/user/user.module';
import { User } from './modules/data-system/entities/user.entity';
import { UserActivity } from './modules/user/entities/user-activity.entity';
import { UserPreferences } from './modules/user/entities/user-preferences.entity';
import { UserAchievement } from './modules/user/entities/user-achievement.entity';

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<'postgres'>('DB_TYPE'),
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          User,
          UserActivity,
          UserPreferences,
          UserAchievement,
          __dirname + '/**/*.entity{.ts,.js}',
        ],
        synchronize: configService.get<boolean>('DB_SYNC'),
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    // Winston logging
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf((info) => {
              const timestamp =
                typeof info.timestamp === 'string' ? info.timestamp : '';
              const level = typeof info.level === 'string' ? info.level : '';
              const message =
                typeof info.message === 'string' ? info.message : '';
              const context =
                typeof info.context === 'string' ? info.context : '';
              return `${timestamp} [${context}] ${level}: ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),

    // Feature modules
    PuzzlesModule,
    AchievementsModule,
    GameModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
