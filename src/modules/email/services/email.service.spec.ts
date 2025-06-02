import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { EmailProviderService } from '../providers/email-provider.service';
import { EmailTemplateService } from './email-template.service';
import { EmailPreferencesService } from './email-preferences.service';
import { EmailTemplate } from '../entities/email-template.entity';

describe('EmailService', () => {
  let service: EmailService;
  let emailProvider: EmailProviderService;
  let templateService: EmailTemplateService;
  let preferencesService: EmailPreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: EmailProviderService,
          useValue: {
            sendEmail: jest.fn(),
            validateEmail: jest.fn(),
            getProviderName: jest.fn(),
          },
        },
        {
          provide: EmailTemplateService,
          useValue: {
            getTemplate: jest.fn(),
            renderTemplate: jest.fn(),
          },
        },
        {
          provide: EmailPreferencesService,
          useValue: {
            hasOptedOut: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    emailProvider = module.get<EmailProviderService>(EmailProviderService);
    templateService = module.get<EmailTemplateService>(EmailTemplateService);
    preferencesService = module.get<EmailPreferencesService>(
      EmailPreferencesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const mockResponse = { messageId: 'test-message-id' };
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue(mockResponse);
      jest.spyOn(preferencesService, 'hasOptedOut').mockResolvedValue(false);

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result).toEqual(mockResponse);
      expect(emailProvider.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
    });

    it('should handle unsubscribed recipients', async () => {
      jest.spyOn(preferencesService, 'hasOptedOut').mockResolvedValue(true);

      const result = await service.sendEmail({
        to: 'unsubscribed@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });

      expect(result).toBeUndefined();
      expect(emailProvider.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('sendTemplatedEmail', () => {
    it('should send a templated email successfully', async () => {
      const template: EmailTemplate = {
        id: 'test-template-id',
        name: 'test-template',
        subject: 'Test Template Subject',
        htmlContent: '<p>Hello {{name}}</p>',
        textContent: 'Hello {{name}}',
        variables: ['name'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResponse = { messageId: 'test-message-id' };
      jest.spyOn(templateService, 'getTemplate').mockResolvedValue(template);
      jest.spyOn(templateService, 'renderTemplate').mockResolvedValue({
        html: '<p>Hello John</p>',
        text: 'Hello John',
      });
      jest.spyOn(emailProvider, 'sendEmail').mockResolvedValue(mockResponse);
      jest.spyOn(preferencesService, 'hasOptedOut').mockResolvedValue(false);

      await service.sendTemplatedEmail('test-template', 'test@example.com', {
        name: 'John',
      });

      expect(templateService.getTemplate).toHaveBeenCalledWith('test-template');
      expect(templateService.renderTemplate).toHaveBeenCalledWith(template, {
        name: 'John',
      });
      expect(emailProvider.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test Template Subject',
        html: '<p>Hello John</p>',
        text: 'Hello John',
      });
    });

    it('should throw error if template not found', async () => {
      jest.spyOn(templateService, 'getTemplate').mockResolvedValue(null as any);

      await expect(
        service.sendTemplatedEmail('non-existent', 'test@example.com', {}),
      ).rejects.toThrow('Email template not found: non-existent');
    });
  });

  describe('specific email methods', () => {
    beforeEach(() => {
      jest.spyOn(service, 'sendTemplatedEmail').mockResolvedValue();
    });

    it('should send welcome email', async () => {
      await service.sendWelcomeEmail('test@example.com', 'John');

      expect(service.sendTemplatedEmail).toHaveBeenCalledWith(
        'welcome',
        'test@example.com',
        { name: 'John' },
      );
    });

    it('should send password reset email', async () => {
      await service.sendPasswordResetEmail('test@example.com', 'reset-token');

      expect(service.sendTemplatedEmail).toHaveBeenCalledWith(
        'password-reset',
        'test@example.com',
        { resetToken: 'reset-token' },
      );
    });

    it('should send weekly newsletter', async () => {
      const content = { title: 'News', body: 'Content' };
      await service.sendWeeklyNewsletter('test@example.com', content);

      expect(service.sendTemplatedEmail).toHaveBeenCalledWith(
        'weekly-newsletter',
        'test@example.com',
        { content },
      );
    });
  });
});
