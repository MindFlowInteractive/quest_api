import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BulkNotificationDto } from '../dto/bulk-notification.dto';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationService } from '../services/notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth implemented
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a single notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  async createNotification(@Body() createDto: CreateNotificationDto) {
    return await this.notificationService.createNotification(createDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create bulk notifications' })
  @ApiResponse({
    status: 201,
    description: 'Bulk notifications created successfully',
  })
  async createBulkNotifications(@Body() bulkDto: BulkNotificationDto) {
    const results = [];

    for (const userId of bulkDto.userIds) {
      const notification = await this.notificationService.createNotification({
        ...bulkDto,
        userId,
      });
      if (notification) {
        results.push(notification);
      }
    }

    return {
      success: true,
      created: results.length,
      total: bulkDto.userIds.length,
      notifications: results,
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({
    status: 200,
    description: 'User notifications retrieved successfully',
  })
  async getMyNotifications(
    @Request() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const userId = req.user?.id; // Adjust based on your auth implementation
    return await this.notificationService.getUserNotifications(
      userId,
      page,
      limit,
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user?.id;
    const success = await this.notificationService.markAsRead(id, userId);

    return {
      success,
      message: success
        ? 'Notification marked as read'
        : 'Failed to mark notification as read',
    };
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'Track notification click' })
  @ApiResponse({ status: 200, description: 'Click tracked successfully' })
  async trackClick(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user?.id;
    const success = await this.notificationService.markAsClicked(id, userId);

    return {
      success,
      message: success ? 'Click tracked successfully' : 'Failed to track click',
    };
  }

  @Post('send/:id')
  @ApiOperation({ summary: 'Manually send a pending notification' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async sendNotification(@Param('id', ParseUUIDPipe) id: string) {
    const success = await this.notificationService.sendNotification(id);

    return {
      success,
      message: success
        ? 'Notification sent successfully'
        : 'Failed to send notification',
    };
  }
}
