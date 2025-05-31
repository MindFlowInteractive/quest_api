import { Controller, Post, Body, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from '../services/email.service';
import { EmailQueueService } from '../services/email-queue.service';
import { EmailOptions } from '../interfaces/email-provider.interface';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailTrackingService } from '../services/email-tracking.service';
import { EmailTrackingStatus } from '../entities/email-tracking.entity';
import { EmailTemplate } from '../entities/email-template.entity';

@ApiTags('Email')
@Controller('api/v1/email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly queueService: EmailQueueService,
    private readonly templateService: EmailTemplateService,
    private readonly trackingService: EmailTrackingService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send an email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email sent successfully',
  })
  async sendEmail(
    @Body()
    emailData: {
      to: string | string[];
      subject: string;
      templateId?: string;
      variables?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    },
  ) {
    // Create tracking record
    const trackingId = await this.trackingService.createTrackingRecord({
      to: emailData.to,
      subject: emailData.subject,
      templateId: emailData.templateId,
      metadata: emailData.metadata,
    });

    // Send email
    const result = await this.emailService.sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      templateId: emailData.templateId,
      variables: emailData.variables,
      metadata: {
        ...emailData.metadata,
        trackingId,
      },
    });

    if (!result) {
      return {
        success: false,
        message: 'No email sent. All recipients unsubscribed.',
        trackingId,
      };
    }
    if (result.messageId) {
      await this.trackingService.updateTrackingStatus(
        trackingId,
        EmailTrackingStatus.SENT,
        result.messageId,
      );
    }
    return {
      success: true,
      trackingId,
      messageId: result.messageId,
    };
  }

  @Post('send-templated')
  @ApiOperation({ summary: 'Send a templated email' })
  @ApiResponse({
    status: 201,
    description: 'Templated email queued for delivery',
  })
  async sendTemplatedEmail(
    @Body()
    data: {
      templateName: string;
      to: string | string[];
      templateData: Record<string, unknown>;
      options?: Partial<EmailOptions>;
    },
  ): Promise<{ trackingId: string }> {
    await this.emailService.sendTemplatedEmail(
      data.templateName,
      data.to,
      data.templateData,
      data.options,
    );
    return { trackingId: data.options?.trackingId || '' };
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Body() template: Partial<EmailTemplate>) {
    return this.templateService.createTemplate(template);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all email templates' })
  @ApiResponse({ status: 200, description: 'List of email templates' })
  async getTemplates() {
    return this.templateService.listTemplates();
  }

  @Get('queue-status')
  @ApiOperation({ summary: 'Get email queue status' })
  @ApiResponse({ status: 200, description: 'Queue status retrieved' })
  async getQueueStatus() {
    return this.queueService.getQueueStatus();
  }

  @Post('clean-queue')
  @ApiOperation({ summary: 'Clean completed and failed jobs from queue' })
  @ApiResponse({ status: 200, description: 'Queue cleaned' })
  async cleanQueue(): Promise<void> {
    await this.queueService.cleanQueue();
  }
}
