import { Injectable, Logger } from '@nestjs/common';
import {
  SESClient,
  SendEmailCommand,
  VerifyEmailIdentityCommand,
} from '@aws-sdk/client-ses';
import {
  EmailProvider,
  EmailOptions,
  EmailProviderConfig,
} from '../interfaces/email-provider.interface';

@Injectable()
export class SESProvider implements EmailProvider {
  private readonly logger = new Logger(SESProvider.name);
  private readonly sesClient: SESClient;

  constructor(private readonly config: EmailProviderConfig) {
    this.sesClient = new SESClient({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.apiKey,
        secretAccessKey: config.apiKey,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
    try {
      const command = new SendEmailCommand({
        Source: options.from || this.config.from,
        Destination: {
          ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
          CcAddresses: options.cc
            ? Array.isArray(options.cc)
              ? options.cc
              : [options.cc]
            : undefined,
          BccAddresses: options.bcc
            ? Array.isArray(options.bcc)
              ? options.bcc
              : [options.bcc]
            : undefined,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: options.html
              ? {
                  Data: options.html,
                  Charset: 'UTF-8',
                }
              : undefined,
            Text: options.text
              ? {
                  Data: options.text,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
        ConfigurationSetName: 'EmailTracking',
        Tags: Object.entries(options.metadata || {}).map(([key, value]) => ({
          Name: key,
          Value: String(value),
        })),
      });

      const result = await this.sesClient.send(command);
      if (!result.MessageId) {
        throw new Error('No message ID returned from SES');
      }
      return { messageId: result.MessageId };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send email via SES: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async validateEmail(email: string): Promise<boolean> {
    try {
      const command = new VerifyEmailIdentityCommand({
        EmailAddress: email,
      });
      await this.sesClient.send(command);
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to validate email via SES: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  getProviderName(): string {
    return 'ses';
  }
}
