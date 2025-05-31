import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BullModule } from '@nestjs/bull';

import * as winston from 'winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

// Import modules
import { UsersModule } from './modules/users/users.module';
import { PuzzlesModule } from './modules/puzzles/puzzles.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { GameModule } from './modules/game/game.module';
import { DataExportModule } from './modules/data-system/data-export/data-export.module';

import { EmailModule } from './modules/email/email.module';

import { AuthModule } from './modules/auth/auth.module';


@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),


    // Bull queue configuration
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],

    // Database connection with TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'quest_api'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('DB_SYNC', false),
        logging: configService.get('DB_LOGGING', false),
      }),

    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
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
    AuthModule,
    UsersModule,
    PuzzlesModule,
    AchievementsModule,
    GameModule,
    DataExportModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
