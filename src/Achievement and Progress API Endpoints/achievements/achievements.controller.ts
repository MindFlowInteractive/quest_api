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
  UseGuards,
  Req
} from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ShareAchievementDto } from './dto/share-achievement.dto';
import { AchievementFilterDto } from './dto/achievement-filter.dto';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Post()
  async createAchievement(@Body(ValidationPipe) createAchievementDto: CreateAchievementDto) {
    return await this.achievementsService.createAchievement(createAchievementDto);
  }

  @Get()
  async getAllAchievements(@Query(ValidationPipe) filters: AchievementFilterDto) {
    return await this.achievementsService.getAllAchievements(filters);
  }

  @Get(':id')
  async getAchievementById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.achievementsService.getAchievementById(id);
  }

  @Get('user/:userId')
  async getUserAchievements(
    @Param('userId') userId: string,
    @Query(ValidationPipe) filters: AchievementFilterDto
  ) {
    return await this.achievementsService.getUserAchievements(userId, filters);
  }

  @Put('user/:userId/:achievementId/progress')
  async updateProgress(
    @Param('userId') userId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @Body(ValidationPipe) updateProgressDto: UpdateProgressDto
  ) {
    return await this.achievementsService.updateProgress(userId, achievementId, updateProgressDto);
  }

  @Post('user/:userId/:achievementId/share')
  async shareAchievement(
    @Param('userId') userId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @Body(ValidationPipe) shareDto: ShareAchievementDto
  ) {
    return await this.achievementsService.shareAchievement(userId, achievementId, shareDto);
  }

  @Get('user/:userId/statistics')
  async getProgressStatistics(@Param('userId') userId: string) {
    return await this.achievementsService.getProgressStatistics(userId);
  }

  @Get('leaderboard/:achievementId?')
  async getLeaderboard(
    @Param('achievementId') achievementId?: string,
    @Query('limit') limit: number = 10
  ) {
    return await this.achievementsService.getLeaderboard(achievementId, limit);
  }

  @Get(':achievementId/hints/:userId')
  async getAchievementHints(
    @Param('userId') userId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string
  ) {
    return await this.achievementsService.getAchievementHints(userId, achievementId);
  }

  @Post('user/:userId/retroactive-check')
  async performRetroactiveCheck(@Param('userId') userId: string) {
    return await this.achievementsService.performRetroactiveCheck(userId);
  }

  @Get('user/:userId/export')
  async exportUserAchievements(
    @Param('userId') userId: string,
    @Query('format') format: 'json' | 'csv' = 'json'
  ) {
    return await this.achievementsService.exportUserAchievements(userId, format);
  }

  @Put('user/:userId/:achievementId/customize')
  async customizeAchievement(
    @Param('userId') userId: string,
    @Param('achievementId', ParseUUIDPipe) achievementId: string,
    @Body() customization: Record<string, any>
  ) {
    return await this.achievementsService.customizeAchievement(userId, achievementId, customization);
  }

  @Get('user/:userId/notifications')
  async getNotifications(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20
  ) {
    return await this.achievementsService.getNotifications(userId, limit);
  }
}
