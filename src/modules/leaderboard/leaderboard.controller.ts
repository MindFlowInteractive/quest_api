import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntry } from './entities/lederboard-entry.entity';

@Controller('leaderboards')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(':id')
  getLeaderboard(@Param('id') id: number) {
    return this.leaderboardService.getLeaderboard(id);
  }

  @Post(':id/entries')
  addEntry(
    @Param('id') id: number,
    @Body() entryData: Partial<LeaderboardEntry>,
  ) {
    return this.leaderboardService.addEntry(id, entryData);
  }

  @Get(':id/top')
  getTopEntries(
    @Param('id') id: number,
    @Query('limit') limit = 10,
    @Query('sortBy') sortBy: 'score' | 'time' | 'efficiency' = 'score',
  ) {
    return this.leaderboardService.getTopEntries(Number(id), Number(limit), sortBy);
  }

  @Get()
  getLeaderboards(
    @Query('category') category?: string,
    @Query('period') period?: string,
    @Query('isPublic') isPublic?: boolean,
  ) {
    return this.leaderboardService.getLeaderboards(category, period, isPublic);
  }

  @Get(':id/rank/:userId')
  getUserRank(
    @Param('id') id: number,
    @Param('userId') userId: number,
    @Query('sortBy') sortBy: 'score' | 'time' | 'efficiency' = 'score',
  ) {
    return this.leaderboardService.getUserRank(Number(id), Number(userId), sortBy);
  }

  @Patch(':id/visibility')
  updateVisibility(
    @Param('id') id: number,
    @Body('isPublic') isPublic: boolean,
  ) {
    return this.leaderboardService.updateVisibility(Number(id), isPublic);
  }

  @Post(':id/reset')
  resetLeaderboard(@Param('id') id: number) {
    return this.leaderboardService.resetLeaderboard(Number(id));
  }

  @Get(':id/stats')
  getLeaderboardStats(@Param('id') id: number) {
    return this.leaderboardService.getLeaderboardStats(Number(id));
  }

  @Post(':id/share/:userId')
  shareLeaderboardPosition(
    @Param('id') id: number,
    @Param('userId') userId: number,
    @Body('platform') platform?: string, // e.g., 'twitter', 'facebook', etc.
  ) {
    return this.leaderboardService.shareLeaderboardPosition(Number(id), Number(userId), platform);
  }
}