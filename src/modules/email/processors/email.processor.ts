import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailProviderFactory } from '../providers/email-provider.factory';
import { EmailOptions } from '../interfaces/email-provider.interface';
import { EmailTrackingService } from '../services/email-tracking.service';
import { EmailTrackingStatus } from '../entities/email-tracking.entity';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailProviderFactory: EmailProviderFactory,
    private readonly trackingService: EmailTrackingService,
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailOptions>): Promise<void> {
    try {
      const provider = this.emailProviderFactory.getProvider();
      const response = await provider.sendEmail(job.data);

      if (response.messageId && job.data.trackingId) {
        await this.trackingService.updateTrackingStatus(
          job.data.trackingId,
          EmailTrackingStatus.SENT,
          response.messageId,
        );
        this.logger.log(`Email sent successfully to ${job.data.to}`);
      } else if (job.data.trackingId) {
        await this.trackingService.updateTrackingStatus(
          job.data.trackingId,
          EmailTrackingStatus.FAILED,
          '',
          'Failed to get message ID',
        );
        throw new Error('Failed to get message ID from email provider');
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process email job: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
