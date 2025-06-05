import { Module } from '@nestjs/common';
import { SessionsModule } from './sessions/sessions.module';
import { GameEngineModule } from './engine/game-engine.module';

@Module({
  imports: [SessionsModule, GameEngineModule],
})
export class GameModule {}
