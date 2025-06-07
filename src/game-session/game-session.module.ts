import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { GameSession } from './entities/game-session.entity';
import { GameSessionService } from './game-session.service';
import { GameSessionController } from './game-session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GameSession]), ScheduleModule.forRoot()],
  controllers: [GameSessionController],
  providers: [GameSessionService],
  exports: [GameSessionService],
})
export class GameSessionModule {}
