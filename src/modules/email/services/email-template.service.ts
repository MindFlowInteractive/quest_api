import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Handlebars from 'handlebars';
import mjml2html from 'mjml';
import { EmailTemplate } from '../entities/email-template.entity';

// Add type declaration for mjml
declare module 'mjml' {
  interface MJMLParseResults {
    html: string;
    errors: any[];
  }
  function mjml2html(mjml: string): MJMLParseResults;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepository: Repository<EmailTemplate>,
  ) {
    // Register custom Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper('uppercase', (text: string) => {
      return text.toUpperCase();
    });

    Handlebars.registerHelper('lowercase', (text: string) => {
      return text.toLowerCase();
    });
  }

  async getTemplate(id: string): Promise<EmailTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    return template;
  }

  async renderTemplate(
    template: EmailTemplate,
    data: Record<string, any>,
  ): Promise<{ html: string; text: string }> {
    try {
      // Convert MJML to HTML if the template is in MJML format
      let htmlContent = template.htmlContent;
      if (template.metadata?.isMjml) {
        const { html, errors } = mjml2html(template.htmlContent);
        if (errors && errors.length > 0) {
          throw new Error(`MJML parsing errors: ${JSON.stringify(errors)}`);
        }
        htmlContent = html;
      }

      // Render HTML template
      const htmlTemplate = Handlebars.compile(htmlContent);
      const html = htmlTemplate(data);

      // Render text template if available
      let text = '';
      if (template.textContent) {
        const textTemplate = Handlebars.compile(template.textContent);
        text = textTemplate(data);
      }

      return { html, text };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to render template: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async createTemplate(
    template: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    const newTemplate = this.templateRepository.create(template);
    return this.templateRepository.save(newTemplate);
  }

  async updateTemplate(
    id: string,
    template: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    const existingTemplate = await this.getTemplate(id);
    const updatedTemplate = this.templateRepository.merge(
      existingTemplate,
      template,
    );
    return this.templateRepository.save(updatedTemplate);
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await this.getTemplate(id);
    await this.templateRepository.remove(template);
  }

  async listTemplates(): Promise<EmailTemplate[]> {
    return this.templateRepository.find();
  }
}
