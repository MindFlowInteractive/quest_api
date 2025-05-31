import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailOptions,
  EmailProvider,
  EmailProviderConfig,
} from '../interfaces/email-provider.interface';
import { SendGridProvider } from './sendgrid.provider';
import { SESProvider } from './ses.provider';

@Injectable()
export class EmailProviderService implements EmailProvider {
  private readonly logger = new Logger(EmailProviderService.name);
  private readonly provider: EmailProvider;

  constructor(private readonly configService: ConfigService) {
    const providerType = this.configService.get<string>(
      'EMAIL_PROVIDER',
      'sendgrid',
    );
    const config: EmailProviderConfig = {
      apiKey: this.configService.get<string>('EMAIL_API_KEY', ''),
      from: this.configService.get<string>('EMAIL_FROM', ''),
      region: this.configService.get<string>('AWS_REGION'),
      endpoint: this.configService.get<string>('EMAIL_ENDPOINT'),
    };

    this.provider = this.createProvider(providerType, config);
  }

  private createProvider(
    type: string,
    config: EmailProviderConfig,
  ): EmailProvider {
    switch (type.toLowerCase()) {
      case 'sendgrid':
        return new SendGridProvider(config);
      case 'ses':
        return new SESProvider(config);
      default:
        throw new Error(`Unsupported email provider: ${type}`);
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
    try {
      return await this.provider.sendEmail(options);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send email: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    try {
      return await this.provider.validateEmail(email);
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
    return this.provider.getProviderName();
  }
}
