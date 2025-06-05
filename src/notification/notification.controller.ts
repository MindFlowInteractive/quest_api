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
import { NotificationService } from './notification.service';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}
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

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('preferences')
  getPreferences(@Req() req: Request) {
    const userId = (req as AuthenticatedRequest).user.id;
    return this.notificationService.getPreferences(userId);
  }

  @Get('preferences')
  getPreferencesDuplicate(@Req() req: Request) {
    return this.notificationService.getPreferences((req as any).user.id);
  }

  @Put('preferences')
  updatePreferences(
    @Req() req: Request,
    @Body() dto: NotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(
      (req as any).user.id,
      dto,
    );
  }

  @Post('push/register')
  registerPushToken(@Req() req: Request, @Body() dto: PushTokenDto) {
    return this.notificationService.registerPushToken(
      (req as any).user.id,
      dto,
    );
  }

  @Delete('push/unregister')
  unregisterPushToken(@Req() req: Request, @Body() dto: PushTokenDto) {
    return this.notificationService.unregisterPushToken(
      (req as any).user.id,
      dto,
    );
  }

  @Get('templates')
  getTemplates() {
    return this.notificationService.getTemplates();
  }

  @Post('templates')
  createTemplate(@Body() dto: TemplateDto) {
    return this.notificationService.createTemplate(dto);
  }

  @Put('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.notificationService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.notificationService.deleteTemplate(id);
  }

  @Get('history')
  getHistory(@Req() req: Request, @Query() query: HistoryQueryDto) {
    return this.notificationService.getHistory((req as any).user.id, query);
  }

  @Post('history/archive')
  archive(@Req() req: Request, @Body() dto: ArchiveDto) {
    return this.notificationService.archive((req as any).user.id, dto);
  }

  @Get('delivery-status/:id')
  getDeliveryStatus(@Param('id') id: string) {
    return this.notificationService.getDeliveryStatus(id);
  }

  @Patch('delivery-status/:id')
  updateDeliveryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.notificationService.updateDeliveryStatus(id, dto);
  }

  @Post('schedule')
  schedule(@Body() dto: ScheduleNotificationDto) {
    return this.notificationService.schedule(dto);
  }

  @Get('schedule')
  getScheduled(@Query() query: any) {
    return this.notificationService.getScheduled(query);
  }

  @Delete('schedule/:id')
  cancelSchedule(@Param('id') id: string) {
    return this.notificationService.cancelScheduled(id);
  }

  @Get('analytics')
  getAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.notificationService.getAnalytics(query);
  }

  @Get('engagement/:id')
  getEngagement(@Param('id') id: string) {
    return this.notificationService.getEngagement(id);
  }

  @Post('acknowledge/:id')
  acknowledge(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AcknowledgeDto,
  ) {
    return this.notificationService.acknowledge((req as any).user.id, id, dto);
  }

  @Get('search')
  search(@Query() query: SearchDto) {
    return this.notificationService.search(query);
  }

  @Get('export')
  export(@Query() dto: ExportDto) {
    return this.notificationService.export(dto);
  }

  @Post('backup')
  backup() {
    return this.notificationService.backup();
  }
}
