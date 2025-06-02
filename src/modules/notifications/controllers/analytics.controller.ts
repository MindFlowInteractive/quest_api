import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationAnalyticsService } from '../services/notification-analytics.service';
import { NotificationCategory, NotificationType } from '@/common/enums/notification.enum';


@ApiTags('notification-analytics')
@Controller('notifications/analytics')
// @UseGuards(JwtAuthGuard) // Add admin guard here
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: NotificationAnalyticsService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get notification analytics overview' })
  @ApiResponse({
    status: 200,
    description: 'Analytics overview retrieved successfully',
  })
  async getOverview(
    @Query('days', new ParseIntPipe({ optional: true })) days = 30,
  ) {
    return await this.analyticsService.getOverallStats(days);
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed notification analytics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed analytics retrieved successfully',
  })
  async getDetailedAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query(
      'category',
      new ParseEnumPipe(NotificationCategory, { optional: true }),
    )
    category?: NotificationCategory,
    @Query('type', new ParseEnumPipe(NotificationType, { optional: true }))
    type?: NotificationType,
    @Query('campaignId') campaignId?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return await this.analyticsService.getAnalytics(
      start,
      end,
      category,
      type,
      campaignId,
    );
  }
}
