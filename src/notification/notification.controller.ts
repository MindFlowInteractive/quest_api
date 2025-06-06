/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import {
  NotificationPreferencesDto,
  PushTokenDto,
  TemplateDto,
  UpdateTemplateDto,
  ScheduleNotificationDto,
  AcknowledgeDto,
  ArchiveDto,
  UpdateDeliveryStatusDto,
  SearchDto,
  HistoryQueryDto,
  AnalyticsQueryDto,
  ExportDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  getPreferences(@Req() req: Request) {
    const userId = (req as AuthenticatedRequest).user.id;
    return this.notificationService.getPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({ type: NotificationPreferencesDto })
  updatePreferences(
    @Req() req: Request,
    @Body() dto: NotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences((req as any).user.id, dto);
  }

  @Post('push/register')
  @ApiOperation({ summary: 'Register a push token for the user' })
  registerPushToken(@Req() req: Request, @Body() dto: PushTokenDto) {
    return this.notificationService.registerPushToken((req as any).user.id, dto);
  }

  @Delete('push/unregister')
  @ApiOperation({ summary: 'Unregister a push token' })
  unregisterPushToken(@Req() req: Request, @Body() dto: PushTokenDto) {
    return this.notificationService.unregisterPushToken((req as any).user.id, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all notification templates' })
  getTemplates() {
    return this.notificationService.getTemplates();
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a new template' })
  @ApiBody({ type: TemplateDto })
  createTemplate(@Body() dto: TemplateDto) {
    return this.notificationService.createTemplate(dto);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update an existing template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.notificationService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete a template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  deleteTemplate(@Param('id') id: string) {
    return this.notificationService.deleteTemplate(id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get notification history' })
  getHistory(@Req() req: Request, @Query() query: HistoryQueryDto) {
    return this.notificationService.getHistory((req as any).user.id, query);
  }

  @Post('history/archive')
  @ApiOperation({ summary: 'Archive notifications' })
  archive(@Req() req: Request, @Body() dto: ArchiveDto) {
    return this.notificationService.archive((req as any).user.id, dto);
  }

  @Get('delivery-status/:id')
  @ApiOperation({ summary: 'Get delivery status of a notification' })
  getDeliveryStatus(@Param('id') id: string) {
    return this.notificationService.getDeliveryStatus(id);
  }

  @Patch('delivery-status/:id')
  @ApiOperation({ summary: 'Update delivery status' })
  updateDeliveryStatus(@Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) {
    return this.notificationService.updateDeliveryStatus(id, dto);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a new notification' })
  schedule(@Body() dto: ScheduleNotificationDto) {
    return this.notificationService.schedule(dto);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Get all scheduled notifications' })
  getScheduled(@Query() query: any) {
    return this.notificationService.getScheduled(query);
  }

  @Delete('schedule/:id')
  @ApiOperation({ summary: 'Cancel scheduled notification' })
  cancelSchedule(@Param('id') id: string) {
    return this.notificationService.cancelScheduled(id);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get notification analytics' })
  getAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.notificationService.getAnalytics(query);
  }

  @Get('engagement/:id')
  @ApiOperation({ summary: 'Get engagement details for a notification' })
  getEngagement(@Param('id') id: string) {
    return this.notificationService.getEngagement(id);
  }

  @Post('acknowledge/:id')
  @ApiOperation({ summary: 'Acknowledge a notification' })
  acknowledge(@Req() req: Request, @Param('id') id: string, @Body() dto: AcknowledgeDto) {
    return this.notificationService.acknowledge((req as any).user.id, id, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search notifications' })
  search(@Query() query: SearchDto) {
    return this.notificationService.search(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export notifications data' })
  export(@Query() dto: ExportDto) {
    return this.notificationService.export(dto);
  }

  @Post('backup')
  @ApiOperation({ summary: 'Trigger a backup of notification data' })
  backup() {
    return this.notificationService.backup();
  }
}
