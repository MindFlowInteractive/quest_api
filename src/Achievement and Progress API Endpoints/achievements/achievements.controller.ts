import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

import { AchievementsService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ShareAchievementDto } from './dto/share-achievement.dto';
import { AchievementFilterDto } from './dto/achievement-filter.dto';

@ApiTags('Achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new achievement' })
  @ApiBody({ type: CreateAchievementDto })
  async createAchievement(@Body(ValidationPipe) createAchievementDto: CreateAchievementDto) {
    return await this.achievementsService.createAchievement(createAchievementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all achievements with optional filters' })
  async getAllAchievements(@Query(ValidationPipe) filters: AchievementFilterDto) {
    return await this.achievementsService.getAllAchievements(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get achievement by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Achievement UUID' })
  async getAchievementById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.achievementsService.getAchievementById(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all achievements for a user' })
  async getUserAchievements(
    @Param('userId') userId: string,
    @Query(ValidationPipe) filters: AchievementFilterDto
  ) {
    return await this.achievementsService.getUserAchievements(userId, filters);
  }

  @Put('user/:userId/:achievementId/progress')
  @ApiOperation({ summary: 'Update user progress on an achievement' })
  async updateProgress(
    @Param('userId') userId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @Body(ValidationPipe) updateProgressDto: UpdateProgressDto
  ) {
    return await this.achievementsService.updateProgress(userId, achievementId, updateProgressDto);
  }

  @Post('user/:userId/:achievementId/share')
  @ApiOperation({ summary: 'Share a user achievement to a platform' })
  async shareAchievement(
    @Param('userId') userId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @Body(ValidationPipe) shareDto: ShareAchievementDto
  ) {
    return await this.achievementsService.shareAchievement(userId, achievementId, shareDto);
  }

  @Get('user/:userId/statistics')
  @ApiOperation({ summary: 'Get achievement statistics for a user' })
  async getProgressStatistics(@Param('userId') userId: string) {
    return await this.achievementsService.getProgressStatistics(userId);
  }

  @Get('leaderboard/:achievementId?')
  @ApiOperation({ summary: 'Get achievement leaderboard (optional achievementId)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLeaderboard(
    @Param('achievementId') achievementId?: string,
    @Query('limit') limit: number = 10
  ) {
    return await this.achievementsService.getLeaderboard(achievementId, limit);
  }

  @Get(':achievementId/hints/:userId')
  @ApiOperation({ summary: 'Get hints for a user-specific achievement' })
  async getAchievementHints(
    @Param('userId') userId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string
  ) {
    return await this.achievementsService.getAchievementHints(userId, achievementId);
  }

  @Post('user/:userId/retroactive-check')
  @ApiOperation({ summary: 'Run a retroactive check for unlocked achievements' })
  async performRetroactiveCheck(@Param('userId') userId: string) {
    return await this.achievementsService.performRetroactiveCheck(userId);
  }

  @Get('user/:userId/export')
  @ApiOperation({ summary: 'Export user achievements in JSON or CSV format' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'], example: 'json' })
  async exportUserAchievements(
    @Param('userId') userId: string,
    @Query('format') format: 'json' | 'csv' = 'json'
  ) {
    return await this.achievementsService.exportUserAchievements(userId, format);
  }

  @Put('user/:userId/:achievementId/customize')
  @ApiOperation({ summary: 'Customize a specific achievement for a user' })
  async customizeAchievement(
    @Param('userId') userId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @Body() customization: Record<string, any>
  ) {
    return await this.achievementsService.customizeAchievement(userId, achievementId, customization);
  }

  @Get('user/:userId/notifications')
  @ApiOperation({ summary: 'Get notification history for a user related to achievements' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getNotifications(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20
  ) {
    return await this.achievementsService.getNotifications(userId, limit);
  }
}
