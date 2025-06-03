import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SubmitMoveDto } from './dto/submit-move.dto';

@Controller('game/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(dto);
  }

  @Get(':id')
  getSession(@Param('id') id: string) {
    return this.sessionsService.getSession(id);
  }

  @Patch(':id/state')
  updateSessionState(@Param('id') id: string, @Body() body: { state: string }) {
    return this.sessionsService.updateSessionState(id, body.state);
  }

  @Post(':id/move')
  submitMove(@Param('id') id: string, @Body() dto: SubmitMoveDto) {
    return this.sessionsService.submitMove(id, dto);
  }

  @Patch(':id/pause')
  pauseSession(@Param('id') id: string) {
    return this.sessionsService.pauseSession(id);
  }

  @Patch(':id/resume')
  resumeSession(@Param('id') id: string) {
    return this.sessionsService.resumeSession(id);
  }

  @Delete(':id')
  terminateSession(@Param('id') id: string) {
    return this.sessionsService.terminateSession(id);
  }

  @Get(':id/share')
  getShareLink(@Param('id') id: string) {
    return this.sessionsService.getShareLink(id);
  }

  @Get(':id/spectate')
  spectateSession(@Param('id') id: string) {
    return this.sessionsService.spectateSession(id);
  }

  @Get(':id/analytics')
  getSessionAnalytics(@Param('id') id: string) {
    return this.sessionsService.getSessionAnalytics(id);
  }

  @Post(':id/recover')
  recoverSession(@Param('id') id: string) {
    return this.sessionsService.recoverSession(id);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.sessionsService.getLeaderboard();
  }

  @Get(':id/export')
  exportSession(@Param('id') id: string) {
    return this.sessionsService.exportSession(id);
  }

  @Get(':id/replay')
  replaySession(@Param('id') id: string) {
    return this.sessionsService.replaySession(id);
  }
}
