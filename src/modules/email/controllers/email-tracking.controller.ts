import { Controller, Post, Get, Body, Param, HttpStatus } from '@nestjs/common';
import { EmailTrackingService } from '../services/email-tracking.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailTrackingStatus } from '../entities/email-tracking.entity';

@ApiTags('Email Tracking')
@Controller('api/v1/email/tracking')
export class EmailTrackingController {
  constructor(private readonly trackingService: EmailTrackingService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Handle email tracking webhook events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event processed successfully',
  })
  async handleWebhook(
    @Body()
    webhookData: {
      messageId: string;
      eventType: 'delivered' | 'opened' | 'clicked' | 'bounced';
      eventData: Record<string, any>;
    },
  ) {
    await this.trackingService.recordEmailEvent(
      webhookData.messageId,
      EmailTrackingStatus[
        webhookData.eventType.toUpperCase() as keyof typeof EmailTrackingStatus
      ],
      webhookData.eventData,
    );
    return { status: 'success' };
  }

  @Get(':messageId')
  @ApiOperation({ summary: 'Get email tracking status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tracking status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tracking record not found',
  })
  async getTrackingStatus(@Param('messageId') messageId: string) {
    return this.trackingService.getTrackingStatus(messageId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiResponse({ status: 200, description: 'Email statistics' })
  async getStats() {
    return this.trackingService.getEmailStats();
  }
}
