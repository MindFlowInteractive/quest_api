import { Injectable, Logger } from '@nestjs/common';
import * as SendGrid from '@sendgrid/mail';
import {
  EmailProvider,
  EmailOptions,
  EmailProviderConfig,
} from '../interfaces/email-provider.interface';
import { MailDataRequired } from '@sendgrid/mail';

@Injectable()
export class SendGridProvider implements EmailProvider {
  private readonly logger = new Logger(SendGridProvider.name);

  constructor(private readonly config: EmailProviderConfig) {
    SendGrid.setApiKey(this.config.apiKey);
  }

  async sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
    try {
      const msg: MailDataRequired = {
        to: options.to,
        from: options.from || this.config.from,
        subject: options.subject,
        html: options.html || '',
        text: options.text || '',
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content.toString('base64'),
          type: attachment.contentType,
          disposition: 'attachment',
        })),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
        customArgs: {
          ...options.metadata,
        },
      };

      const [response] = await SendGrid.send(msg);
      return { messageId: response.headers['x-message-id'] };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send email via SendGrid: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to validate email: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  getProviderName(): string {
    return 'sendgrid';
  }
}
