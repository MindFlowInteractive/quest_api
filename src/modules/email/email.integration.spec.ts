import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { EmailModule } from './email.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EmailTemplate } from './entities/email-template.entity';
import {
  EmailTracking,
  EmailTrackingStatus,
} from './entities/email-tracking.entity';
import { EmailPreferences } from './entities/email-preferences.entity';
import { MockEmailProvider } from './providers/mock-email.provider';
import { EMAIL_PROVIDER } from './constants';
import { Repository } from 'typeorm';
import { EmailService } from './services/email.service';
import { EmailTemplateService } from './services/email-template.service';
import { EmailPreferencesService } from './services/email-preferences.service';
import { EmailProviderService } from './providers/email-provider.service';
import { EmailTrackingService } from './services/email-tracking.service';

describe('Email Integration Tests', () => {
  let app: INestApplication;
  let templateRepository: Repository<EmailTemplate>;
  let trackingRepository: Repository<EmailTracking>;
  let preferencesRepository: Repository<EmailPreferences>;
  let emailService: EmailService;
  let templateService: EmailTemplateService;
  let preferencesService: EmailPreferencesService;
  let emailProvider: EmailProviderService;
  let trackingService: EmailTrackingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
          username: process.env.TEST_DB_USERNAME || 'postgres',
          password: process.env.TEST_DB_PASSWORD || 'postgres',
          database: process.env.TEST_DB_NAME || 'logiquest_test',
          entities: [EmailTemplate, EmailTracking, EmailPreferences],
          synchronize: true,
        }),
        BullModule.forRoot({
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
        }),
        EmailModule,
      ],
    })
      .overrideProvider(EMAIL_PROVIDER)
      .useClass(MockEmailProvider)
      .overrideProvider('SendGridProvider')
      .useClass(MockEmailProvider)
      .overrideProvider('SESProvider')
      .useClass(MockEmailProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get repositories
    templateRepository = moduleFixture.get(getRepositoryToken(EmailTemplate));
    trackingRepository = moduleFixture.get(getRepositoryToken(EmailTracking));
    preferencesRepository = moduleFixture.get(
      getRepositoryToken(EmailPreferences),
    );

    emailService = moduleFixture.get<EmailService>(EmailService);
    templateService =
      moduleFixture.get<EmailTemplateService>(EmailTemplateService);
    preferencesService = moduleFixture.get<EmailPreferencesService>(
      EmailPreferencesService,
    );
    emailProvider =
      moduleFixture.get<EmailProviderService>(EmailProviderService);
    trackingService =
      moduleFixture.get<EmailTrackingService>(EmailTrackingService);
  }, 60000);

  beforeEach(async () => {
    // Clear all tables before each test
    await templateRepository.clear();
    await trackingRepository.clear();
    await preferencesRepository.clear();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 60000);

  describe('Email Templates', () => {
    it('should create a new email template', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/email/templates')
        .send({
          name: 'test-template',
          subject: 'Test Template',
          htmlContent: '<mjml><mj-body>Test</mj-body></mjml>',
          textContent: 'Test',
          category: 'test',
          variables: ['name'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('test-template');
        });
    }, 30000);

    it('should get all email templates', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/email/templates')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    }, 30000);

    it('should create and retrieve email template', async () => {
      const template = await templateService.createTemplate({
        name: 'test-template',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
        textContent: 'Test content',
        variables: ['name'],
      });

      expect(template).toBeDefined();
      expect(template.name).toBe('test-template');

      const retrieved = await templateService.getTemplate('test-template');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('test-template');
    });

    it('should render template with variables', async () => {
      const template = await templateService.createTemplate({
        name: 'test-template',
        subject: 'Test Subject',
        htmlContent: '<p>Hello {{name}}</p>',
        textContent: 'Hello {{name}}',
        variables: ['name'],
      });

      const rendered = await templateService.renderTemplate(template, {
        name: 'John',
      });
      expect(rendered.html).toBe('<p>Hello John</p>');
      expect(rendered.text).toBe('Hello John');
    });
  });

  describe('Email Preferences', () => {
    it('should update user email preferences', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/email/preferences')
        .send({
          email: 'test@example.com',
          preferences: {
            newsletters: true,
            announcements: false,
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe('test@example.com');
          expect(res.body.preferences.newsletters).toBe(true);
        });
    }, 30000);

    it('should handle unsubscribe request', async () => {
      // First create a preference record
      await preferencesRepository.save({
        email: 'test@example.com',
        preferences: { newsletters: true },
        unsubscribeToken: 'valid-token',
      });

      return request(app.getHttpServer())
        .post('/api/v1/email/preferences/unsubscribe')
        .send({
          email: 'test@example.com',
          token: 'valid-token',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    }, 30000);

    it('should create and update email preferences', async () => {
      const email = 'test@example.com';
      const preferences = await preferencesService.updatePreferences(email, {
        newsletters: true,
        announcements: false,
        marketing: true,
        transactional: true,
        unsubscribed: false,
      });

      expect(preferences).toBeDefined();
      expect(preferences.email).toBe(email);
      expect(preferences.preferences.newsletters).toBe(true);
      expect(preferences.preferences.announcements).toBe(false);

      const updated = await preferencesService.updatePreferences(email, {
        newsletters: false,
        announcements: true,
        marketing: true,
        transactional: true,
        unsubscribed: false,
      });

      expect(updated.preferences.newsletters).toBe(false);
      expect(updated.preferences.announcements).toBe(true);
    });

    it('should handle unsubscribe', async () => {
      const email = 'test@example.com';
      await preferencesService.updatePreferences(email, {
        newsletters: true,
        announcements: true,
        marketing: true,
        transactional: true,
        unsubscribed: false,
      });

      await preferencesService.unsubscribe(email, 'test-token');
      const preferences = await preferencesService.getPreferences(email);
      expect(preferences.preferences.unsubscribed).toBe(true);
    });
  });

  describe('Email Sending', () => {
    it('should send a test email', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/email/send')
        .send({
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('trackingId');
        });
    }, 30000);

    it('should send a templated email', async () => {
      // First create a template
      await templateRepository.save({
        name: 'test-template',
        subject: 'Test Template',
        htmlContent: '<mjml><mj-body>Test</mj-body></mjml>',
        textContent: 'Test',
        category: 'test',
        variables: ['name'],
      });

      return request(app.getHttpServer())
        .post('/api/v1/email/send-templated')
        .send({
          templateName: 'test-template',
          to: 'test@example.com',
          templateData: {
            name: 'Test User',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('trackingId');
        });
    }, 30000);

    it('should send email and track status', async () => {
      const mockResponse = { messageId: 'test-message-id' };
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue(mockResponse);

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result).toBeDefined();
      expect(result!.messageId).toBe('test-message-id');

      const tracking = await trackingRepository.findOne({
        where: { messageId: 'test-message-id' },
      });

      expect(tracking).toBeDefined();
      expect(tracking?.status).toBe(EmailTrackingStatus.PENDING);
    });

    it('should send templated email', async () => {
      await templateService.createTemplate({
        name: 'test-template',
        subject: 'Test Subject',
        htmlContent: '<p>Hello {{name}}</p>',
        textContent: 'Hello {{name}}',
        variables: ['name'],
      });

      const mockResponse = { messageId: 'test-message-id' };
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue(mockResponse);

      await emailService.sendTemplatedEmail(
        'test-template',
        'test@example.com',
        { name: 'John' },
      );

      const tracking = await trackingRepository.findOne({
        where: { messageId: 'test-message-id' },
      });

      expect(tracking).toBeDefined();
      expect(tracking?.status).toBe(EmailTrackingStatus.PENDING);
    });

    it('should handle email tracking status updates', async () => {
      const mockResponse = { messageId: 'test-message-id' };
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue(mockResponse);

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      const tracking = await trackingRepository.findOne({
        where: { messageId: 'test-message-id' },
      });

      if (tracking) {
        await trackingService.updateTrackingStatus(
          tracking.id,
          EmailTrackingStatus.SENT,
          'test-message-id',
        );
      }

      const updatedTracking = await trackingRepository.findOne({
        where: { messageId: 'test-message-id' },
      });

      expect(updatedTracking).toBeDefined();
      expect(updatedTracking?.status).toBe(EmailTrackingStatus.SENT);
    });

    it('should handle email delivery status', async () => {
      const mockResponse = { messageId: 'test-message-id' };
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue(mockResponse);

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      const tracking = await trackingRepository.findOne({
        where: { messageId: 'test-message-id' },
      });

      if (tracking) {
        await trackingService.updateTrackingStatus(
          tracking.id,
          EmailTrackingStatus.DELIVERED,
          'test-message-id',
        );
      }

      const updatedTracking = await trackingRepository.findOne({
        where: { messageId: 'test-message-id' },
      });

      expect(updatedTracking).toBeDefined();
      expect(updatedTracking?.status).toBe(EmailTrackingStatus.DELIVERED);
    });
  });

  describe('Email Tracking', () => {
    it('should track email events', async () => {
      // First create a tracking record
      await trackingRepository.save({
        id: 'test-tracking-id',
        messageId: 'test-message-id',
        recipient: 'test@example.com',
        status: EmailTrackingStatus.SENT,
      });

      return request(app.getHttpServer())
        .post('/api/v1/email/tracking/webhook')
        .send({
          type: 'delivered',
          messageId: 'test-message-id',
          email: 'test@example.com',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    }, 30000);

    it('should get email tracking status', async () => {
      // First create a tracking record
      await trackingRepository.save({
        id: 'test-tracking-id',
        messageId: 'test-message-id',
        recipient: 'test@example.com',
        status: EmailTrackingStatus.SENT,
      });

      return request(app.getHttpServer())
        .get('/api/v1/email/tracking/test-message-id')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('events');
        });
    }, 30000);
  });
});
