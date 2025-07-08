import { Controller, Post, Body, Param } from '@nestjs/common';
import { DifficultyService } from './difficulty.service';

@Controller('difficulty')
export class DifficultyController {
  constructor(private readonly service: DifficultyService) {}

  @Post('assess/:playerId')
  async assessSkill(@Param('playerId') playerId: string, @Body() metrics: any) {
    return this.service.assessPlayerSkill(playerId, metrics);
  }

  @Post('adjust/:playerId')
  async adjustDifficulty(@Param('playerId') playerId: string) {
    return this.service.adjustDifficulty(playerId);
  }
}
