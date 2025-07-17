import { Module } from '@nestjs/common';
import { PuzzleService } from './puzzle.service';
import { PuzzleController } from './puzzle.controller';
import { AntiCheatModule } from '../modules/anti-cheat/anti-cheat.module';

@Module({
  imports: [AntiCheatModule],
  controllers: [PuzzleController],
  providers: [PuzzleService],
  exports: [PuzzleService],
})
export class PuzzleModule {}
