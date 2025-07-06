import { Controller, Post, Body } from '@nestjs/common';
import { HintService } from './hint.service';
import { RequestHintDto } from './dto/request-hint.dto';

@Controller('hints')
export class HintController {
  constructor(private readonly hintService: HintService) {}

  @Post('request')
  async requestHint(@Body() dto: RequestHintDto) {
    return this.hintService.generateHint(dto.userId, dto.puzzleId, dto.puzzleType, dto.currentState);
  }
}