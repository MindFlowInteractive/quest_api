import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  PlayerBehaviorQueryDto,
  PuzzleAnalyticsQueryDto,
  RevenueQueryDto,
} from './dto/analytics-query.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Player Behavior Analytics
  @Get('player-behavior')
  @ApiOperation({ summary: 'Get player behavior analytics with filtering' })
  @ApiResponse({ status: 200, description: 'Player behavior data retrieved successfully' })
  async getPlayerBehavior(@Query() query: PlayerBehaviorQueryDto) {
    return this.analyticsService.getPlayerBehaviorAnalytics(query);
  }

  @Get('player-behavior/heatmap')
  @ApiOperation({ summary: 'Get player behavior heatmap data' })
  async getPlayerBehaviorHeatmap(@Query() query: PlayerBehaviorQueryDto) {
    return this.analyticsService.getPlayerBehaviorHeatmap(query);
  }

  @Get('player-behavior/segmentation')
  @ApiOperation({ summary: 'Get player segmentation analytics' })
  async getPlayerSegmentation(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getPlayerSegmentation(query);
  }

  // Puzzle Performance Analytics
  @Get('puzzle-performance')
  @ApiOperation({ summary: 'Get puzzle performance analytics' })
  async getPuzzlePerformance(@Query() query: PuzzleAnalyticsQueryDto) {
    return this.analyticsService.getPuzzlePerformanceAnalytics(query);
  }

  @Get('puzzle-performance/difficulty')
  @ApiOperation({ summary: 'Get puzzle difficulty analytics' })
  async getPuzzleDifficultyAnalytics(@Query() query: PuzzleAnalyticsQueryDto) {
    return this.analyticsService.getPuzzleDifficultyAnalytics(query);
  }

  @Get('puzzle-performance/completion-rates')
  @ApiOperation({ summary: 'Get puzzle completion rates' })
  async getPuzzleCompletionRates(@Query() query: PuzzleAnalyticsQueryDto) {
    return this.analyticsService.getPuzzleCompletionRates(query);
  }

  // Engagement and Retention
  @Get('engagement')
  @ApiOperation({ summary: 'Get engagement analytics' })
  async getEngagementAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEngagementAnalytics(query);
  }

  @Get('retention')
  @ApiOperation({ summary: 'Get retention analytics' })
  async getRetentionAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getRetentionAnalytics(query);
  }

  @Get('retention/cohort')
  @ApiOperation({ summary: 'Get cohort retention analysis' })
  async getCohortRetention(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getCohortRetention(query);
  }

  // Revenue and Monetization
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  async getRevenueAnalytics(@Query() query: RevenueQueryDto) {
    return this.analyticsService.getRevenueAnalytics(query);
  }

  @Get('revenue/trends')
  @ApiOperation({ summary: 'Get revenue trends' })
  async getRevenueTrends(@Query() query: RevenueQueryDto) {
    return this.analyticsService.getRevenueTrends(query);
  }

  @Get('revenue/ltv')
  @ApiOperation({ summary: 'Get customer lifetime value analytics' })
  async getCustomerLTV(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getCustomerLTV(query);
  }

  // A/B Testing
  @Get('ab-tests')
  @ApiOperation({ summary: 'Get A/B testing results' })
  async getABTestResults(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getABTestResults(query);
  }

  @Get('ab-tests/:testName/statistical-analysis')
  @ApiOperation({ summary: 'Get statistical analysis for A/B test' })
  async getABTestStatisticalAnalysis(@Param('testName') testName: string) {
    return this.analyticsService.getABTestStatisticalAnalysis(testName);
  }

  // Event Tracking and Funnel Analysis
  @Get('events')
  @ApiOperation({ summary: 'Get custom event tracking data' })
  async getEventTracking(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEventTracking(query);
  }

  @Get('funnel-analysis')
  @ApiOperation({ summary: 'Get funnel analysis' })
  async getFunnelAnalysis(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getFunnelAnalysis(query);
  }

  @Get('conversion-rates')
  @ApiOperation({ summary: 'Get conversion rates' })
  async getConversionRates(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getConversionRates(query);
  }

  // Real-time Analytics
  @Get('real-time/dashboard')
  @ApiOperation({ summary: 'Get real-time dashboard data' })
  async getRealTimeDashboard() {
    return this.analyticsService.getRealTimeDashboard();
  }

  @Get('real-time/active-users')
  @ApiOperation({ summary: 'Get real-time active users' })
  async getRealTimeActiveUsers() {
    return this.analyticsService.getRealTimeActiveUsers();
  }

  // Predictive Analytics
  @Get('predictive/churn-risk')
  @ApiOperation({ summary: 'Get churn risk predictions' })
  async getChurnRiskPredictions(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getChurnRiskPredictions(query);
  }

  @Get('predictive/revenue-forecast')
  @ApiOperation({ summary: 'Get revenue forecasting' })
  async getRevenueForecast(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getRevenueForecast(query);
  }

  @Get('predictive/engagement-forecast')
  @ApiOperation({ summary: 'Get engagement forecasting' })
  async getEngagementForecast(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEngagementForecast(query);
  }

  // Data Export and Integration
  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export analytics data' })
  async exportAnalyticsData(@Body() exportRequest: any) {
    return this.analyticsService.exportAnalyticsData(exportRequest);
  }

  @Get('export/:exportId')
  @ApiOperation({ summary: 'Get export status and download link' })
  async getExportStatus(@Param('exportId') exportId: string) {
    return this.analyticsService.getExportStatus(exportId);
  }

  // Visualization and Charting
  @Get('visualization/charts')
  @ApiOperation({ summary: 'Get chart data for visualization' })
  async getChartData(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getChartData(query);
  }

  @Get('visualization/kpi-dashboard')
  @ApiOperation({ summary: 'Get KPI dashboard data' })
  async getKPIDashboard(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getKPIDashboard(query);
  }
}
