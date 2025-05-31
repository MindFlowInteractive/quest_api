import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../src/modules/email/entities/email-template.entity';
import { EmailPreferences } from '../src/modules/email/entities/email-preferences.entity';
import { EmailTracking } from '../src/modules/email/entities/email-tracking.entity';

describe('Email Integration Tests', () => {
  let app: INestApplication;
  let emailTemplateRepository: Repository<EmailTemplate>;
  let emailPreferencesRepository: Repository<EmailPreferences>;
  let emailTrackingRepository: Repository<EmailTracking>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    emailTemplateRepository = moduleFixture.get(
      getRepositoryToken(EmailTemplate),
    );
    emailPreferencesRepository = moduleFixture.get(
      getRepositoryToken(EmailPreferences),
    );
    emailTrackingRepository = moduleFixture.get(
      getRepositoryToken(EmailTracking),
    );
  }, 60000);

  beforeEach(async () => {
    // Clear all tables before each test
    await emailTemplateRepository.clear();
    await emailPreferencesRepository.clear();
    await emailTrackingRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  }, 60000);

  describe('Email Templates', () => {
    it('should create an email template', async () => {
      const templateData = {
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'Hello {{name}}!',
        variables: ['name'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/email/templates')
        .send(templateData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(templateData.name);
      expect(response.body.subject).toBe(templateData.subject);
      expect(response.body.body).toBe(templateData.body);
      expect(response.body.variables).toEqual(templateData.variables);
    }, 30000);

    it('should get all email templates', async () => {
      // Create a test template first
      await emailTemplateRepository.save({
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'Test Body',
        variables: ['name'],
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/email/templates')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].name).toBe('Test Template');
    }, 30000);

    it('should get a template by ID', async () => {
      // Create a test template first
      const template = await emailTemplateRepository.save({
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'Test Body',
        variables: ['name'],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/email/templates/${template.id}`)
        .expect(200);

      expect(response.body.id).toBe(template.id);
      expect(response.body.name).toBe(template.name);
    }, 30000);

    it('should update a template', async () => {
      // Create a test template first
      const template = await emailTemplateRepository.save({
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'Test Body',
        variables: ['name'],
      });

      const updateData = {
        name: 'Updated Template',
        subject: 'Updated Subject',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/email/templates/${template.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.subject).toBe(updateData.subject);
    }, 30000);

    it('should delete a template', async () => {
      // Create a test template first
      const template = await emailTemplateRepository.save({
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'Test Body',
        variables: ['name'],
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/email/templates/${template.id}`)
        .expect(204);

      const deletedTemplate = await emailTemplateRepository.findOne({
        where: { id: template.id },
      });
      expect(deletedTemplate).toBeNull();
    }, 30000);

    it('should render a template with variables', async () => {
      // Create a test template first
      const template = await emailTemplateRepository.save({
        name: 'Test Template',
        subject: 'Test Subject',
        body: 'Hello {{name}}! Welcome to {{service}}.',
        variables: ['name', 'service'],
      });

      const variables = {
        name: 'John',
        service: 'Our Platform',
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/email/templates/${template.id}/render`)
        .send(variables)
        .expect(200);

      expect(response.body.rendered).toBe(
        'Hello John! Welcome to Our Platform.',
      );
    }, 30000);
  });

  describe('Email Preferences', () => {
    it('should update email preferences', async () => {
      const preferencesData = {
        email: 'test@example.com',
        preferences: {
          marketing: true,
          notifications: true,
          updates: false,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/email/preferences')
        .send(preferencesData)
        .expect(201);

      expect(response.body.email).toBe(preferencesData.email);
      expect(response.body.preferences).toEqual(preferencesData.preferences);
    }, 30000);

    it('should unsubscribe from emails', async () => {
      // Create test preferences first
      const preferences = await emailPreferencesRepository.save({
        email: 'test@example.com',
        preferences: {
          marketing: true,
          notifications: true,
          updates: true,
        },
        unsubscribeToken: 'test-token',
      });

      const response = await request(app.getHttpServer())
        .post(
          `/api/v1/email/preferences/unsubscribe/${preferences.unsubscribeToken}`,
        )
        .expect(200);

      expect(response.body.unsubscribed).toBe(true);
    }, 30000);
  });

  describe('Email Tracking', () => {
    it('should track email events', async () => {
      // Create a test tracking record
      const tracking = await emailTrackingRepository.save({
        id: 'test-id',
        to: 'test@example.com',
        subject: 'Test Subject',
        status: 'sent',
        messageId: 'test-message-id',
      });

      const webhookData = {
        messageId: tracking.messageId,
        eventType: 'delivered',
        eventData: {
          timestamp: new Date().toISOString(),
          ip: '127.0.0.1',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/email/tracking/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.status).toBe('delivered');
    }, 30000);

    it('should get tracking status', async () => {
      // Create a test tracking record
      const tracking = await emailTrackingRepository.save({
        id: 'test-id',
        to: 'test@example.com',
        subject: 'Test Subject',
        status: 'sent',
        messageId: 'test-message-id',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/email/tracking/${tracking.messageId}`)
        .expect(200);

      expect(response.body.messageId).toBe(tracking.messageId);
      expect(response.body.status).toBe('sent');
    }, 30000);
  });
});
