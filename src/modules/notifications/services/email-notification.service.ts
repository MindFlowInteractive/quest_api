import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailConfig = {
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT', 587),
      secure: this.configService.get('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      const mailOptions = {
        from: this.configService.get('EMAIL_FROM'),
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.debug(`Email sent successfully: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.to}:`, error);
      return false;
    }
  }

  async sendBulkEmails(
    payloads: EmailPayload[],
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    for (const payload of payloads) {
      const success = await this.sendEmail(payload);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return { successCount, failureCount };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error('Email service connection failed:', error);
      return false;
    }
  }
}
