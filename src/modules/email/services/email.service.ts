import { Injectable, Logger } from '@nestjs/common';
import { EmailProviderService } from '../providers/email-provider.service';
import { EmailTemplateService } from './email-template.service';
import { EmailPreferencesService } from './email-preferences.service';
import { EmailOptions } from '../interfaces/email-provider.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly emailProvider: EmailProviderService,
    private readonly templateService: EmailTemplateService,
    private readonly preferencesService: EmailPreferencesService,
  ) {}

  async sendEmail(
    options: EmailOptions,
  ): Promise<{ messageId: string } | undefined> {
    try {
      // Check if recipient has unsubscribed
      const to = Array.isArray(options.to) ? options.to : [options.to];
      let allUnsubscribed = true;
      for (const recipient of to) {
        if (!(await this.preferencesService.hasOptedOut(recipient))) {
          allUnsubscribed = false;
        } else {
          this.logger.warn(
            `Recipient ${recipient} has unsubscribed from emails`,
          );
        }
      }
      if (allUnsubscribed) {
        return undefined;
      }

      // Get template if templateId is provided
      let html = options.html;
      let text = options.text;
      if (options.templateId) {
        const template = await this.templateService.getTemplate(
          options.templateId,
        );
        const rendered = await this.templateService.renderTemplate(
          template,
          options.templateData || {},
        );
        html = rendered.html;
        text = rendered.text || rendered.html.replace(/<[^>]*>/g, ''); // Strip HTML tags for plain text version
      }

      // Send email through provider
      const result = await this.emailProvider.sendEmail({
        ...options,
        html,
        text,
      });

      return { messageId: result.messageId };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send email: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async sendTemplatedEmail(
    templateName: string,
    to: string | string[],
    templateData: Record<string, unknown>,
    options: Partial<EmailOptions> = {},
  ): Promise<void> {
    const template = await this.templateService.getTemplate(templateName);
    if (!template) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    const renderedTemplate = await this.templateService.renderTemplate(
      template,
      templateData,
    );

    await this.sendEmail({
      to,
      subject: template.subject,
      html: renderedTemplate.html,
      text: renderedTemplate.text,
      ...options,
    });
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    await this.sendTemplatedEmail('welcome', userEmail, {
      name: userName,
    });
  }

  async sendPasswordResetEmail(
    userEmail: string,
    resetToken: string,
  ): Promise<void> {
    await this.sendTemplatedEmail('password-reset', userEmail, {
      resetToken,
    });
  }

  async sendWeeklyNewsletter(
    userEmail: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    await this.sendTemplatedEmail('weekly-newsletter', userEmail, {
      content,
    });
  }
}
