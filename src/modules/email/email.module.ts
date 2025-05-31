import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EmailController } from './controllers/email.controller';
import { EmailPreferencesController } from './controllers/email-preferences.controller';
import { EmailTrackingController } from './controllers/email-tracking.controller';
import { EmailTemplateController } from './controllers/email-template.controller';
import { EmailService } from './services/email.service';
import { EmailPreferencesService } from './services/email-preferences.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailProviderService } from './providers/email-provider.service';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailPreferences } from './entities/email-preferences.entity';
import { EmailTracking } from './entities/email-tracking.entity';
import { EmailProcessor } from './processors/email.processor';
import { EmailProviderFactory } from './providers/email-provider.factory';
import { EMAIL_PROVIDER } from './constants';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SESProvider } from './providers/ses.provider';
import { MockEmailProvider } from './providers/mock-email.provider';
import { EmailQueueService } from './services/email-queue.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EmailTemplate, EmailPreferences, EmailTracking]),
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [
    EmailController,
    EmailPreferencesController,
    EmailTrackingController,
    EmailTemplateController,
  ],
  providers: [
    EmailService,
    EmailPreferencesService,
    EmailTrackingService,
    EmailTemplateService,
    EmailProviderService,
    EmailProcessor,
    EmailProviderFactory,
    EmailQueueService,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const providerType = configService.get<string>(
          'EMAIL_PROVIDER',
          'mock',
        );
        const config = {
          apiKey: configService.get<string>('EMAIL_API_KEY', ''),
          from: configService.get<string>('EMAIL_FROM', ''),
          region: configService.get<string>('AWS_REGION'),
          endpoint: configService.get<string>('EMAIL_ENDPOINT'),
        };

        switch (providerType.toLowerCase()) {
          case 'sendgrid':
            return new SendGridProvider(config);
          case 'ses':
            return new SESProvider(config);
          default:
            return new MockEmailProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    EmailService,
    EmailPreferencesService,
    EmailTrackingService,
    EmailTemplateService,
  ],
})
export class EmailModule {}
