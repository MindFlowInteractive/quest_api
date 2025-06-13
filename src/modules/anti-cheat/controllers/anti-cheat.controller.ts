import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AntiCheatDetectionService } from '../services/anti-cheat-detection.service';
import { ManualReviewService } from '../services/manual-review.service';
import { AppealService } from '../services/appeal.service';
import { CommunityModerationService } from '../services/community-moderation.service';
import { AntiCheatAnalyticsService } from '../services/anti-cheat-analytics.service';
import { ValidatePuzzleSolutionDto } from '../dto/validate-puzzle-solution.dto';
import { CreateAppealDto } from '../dto/create-appeal.dto';
import { CreateCommunityReportDto } from '../dto/create-community-report.dto';

@ApiTags('anti-cheat')
@Controller('anti-cheat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AntiCheatController {
  constructor(
    private readonly detectionService: AntiCheatDetectionService,
    private readonly manualReviewService: ManualReviewService,
    private readonly appealService: AppealService,
    private readonly communityModerationService: CommunityModerationService,
    private readonly analyticsService: AntiCheatAnalyticsService,
  ) {}

  @Post('validate-solution')
  @ApiOperation({ summary: 'Validate puzzle solution with anti-cheat checks' })
  @ApiResponse({ status: 200, description: 'Solution validation result' })
  async validateSolution(
    @Body() validateDto: ValidatePuzzleSolutionDto,
    @Req() req: any,
  ) {
    return this.detectionService.validatePuzzleSolution({
      ...validateDto,
      userId: req.user.id,
    });
  }

  @Get('detections')
  @ApiOperation({ summary: 'Get cheat detections for current user' })
  @ApiResponse({ status: 200, description: 'List of cheat detections' })
  async getUserDetections(@Req() req: any) {
    return this.detectionService.getUserDetections(req.user.id);
  }

  @Post('appeals')
  @ApiOperation({ summary: 'Create an appeal for a cheat detection' })
  @ApiResponse({ status: 201, description: 'Appeal created successfully' })
  async createAppeal(
    @Body() createAppealDto: CreateAppealDto,
    @Req() req: any,
  ) {
    return this.appealService.createAppeal({
      ...createAppealDto,
      appellantId: req.user.id,
    });
  }

  @Get('appeals')
  @ApiOperation({ summary: 'Get appeals for current user' })
  @ApiResponse({ status: 200, description: 'List of user appeals' })
  async getUserAppeals(@Req() req: any) {
    return this.appealService.getUserAppeals(req.user.id);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Report suspicious behavior' })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  async createReport(
    @Body() createReportDto: CreateCommunityReportDto,
    @Req() req: any,
  ) {
    return this.communityModerationService.createReport({
      ...createReportDto,
      reporterId: req.user.id,
    });
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get reports created by current user' })
  @ApiResponse({ status: 200, description: 'List of user reports' })
  async getUserReports(@Req() req: any) {
    return this.communityModerationService.getUserReports(req.user.id);
  }

  // Admin/Moderator endpoints
  @Get('admin/detections')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Get all cheat detections (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all cheat detections' })
  async getAllDetections(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.detectionService.getAllDetections({
      status,
      severity,
      limit: limit || 50,
      offset: offset || 0,
    });
  }

  @Get('admin/reviews')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Get manual reviews (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of manual reviews' })
  async getManualReviews(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.manualReviewService.getReviews({
      status,
      priority,
      assigneeId,
    });
  }

  @Post('admin/reviews/:id/assign')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Assign manual review (Admin only)' })
  @ApiResponse({ status: 200, description: 'Review assigned successfully' })
  async assignReview(
    @Param('id') reviewId: string,
    @Req() req: any,
  ) {
    return this.manualReviewService.assignReview(reviewId, req.user.id);
  }

  @Post('admin/reviews/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Complete manual review (Admin only)' })
  @ApiResponse({ status: 200, description: 'Review completed successfully' })
  async completeReview(
    @Param('id') reviewId: string,
    @Body() reviewData: any,
    @Req() req: any,
  ) {
    return this.manualReviewService.completeReview(reviewId, req.user.id, reviewData);
  }

  @Get('admin/appeals')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Get all appeals (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of appeals' })
  async getAllAppeals(@Query('status') status?: string) {
    return this.appealService.getAllAppeals({ status });
  }

  @Post('admin/appeals/:id/review')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Review appeal (Admin only)' })
  @ApiResponse({ status: 200, description: 'Appeal reviewed successfully' })
  async reviewAppeal(
    @Param('id') appealId: string,
    @Body() reviewData: any,
    @Req() req: any,
  ) {
    return this.appealService.reviewAppeal(appealId, req.user.id, reviewData);
  }

  @Get('admin/reports')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Get community reports (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of community reports' })
  async getAllReports(@Query('status') status?: string) {
    return this.communityModerationService.getAllReports({ status });
  }

  @Post('admin/reports/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Resolve community report (Admin only)' })
  @ApiResponse({ status: 200, description: 'Report resolved successfully' })
  async resolveReport(
    @Param('id') reportId: string,
    @Body() resolutionData: any,
    @Req() req: any,
  ) {
    return this.communityModerationService.resolveReport(reportId, req.user.id, resolutionData);
  }

  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get anti-cheat analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Anti-cheat analytics data' })
  async getAnalytics() {
    return this.analyticsService.getAnalytics();
  }
}
