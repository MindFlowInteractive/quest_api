import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';

export interface CreateTemplateDto {
  name: string;
  category: string;
  title: string;
  message: string;
  emailTemplate?: string;
  variables?: string[];
  language?: string;
}

export interface UpdateTemplateDto {
  title?: string;
  message?: string;
  emailTemplate?: string;
  variables?: string[];
  isActive?: boolean;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
  ) {}

  async createTemplate(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    // Assuming you have a NotificationCategory entity and repository
    // You need to inject the category repository and fetch the category entity by name or id
    // For demonstration, let's assume category is fetched by name
    const categoryRepository = (this.templateRepository.manager as any).getRepository('NotificationCategory');
    const categoryEntity = await categoryRepository.findOne({ where: { name: dto.category } });
    if (!categoryEntity) {
      throw new Error(`Category '${dto.category}' not found`);
    }

    const template = this.templateRepository.create({
      ...dto,
      category: categoryEntity,
      language: dto.language || 'en',
    });

    return await this.templateRepository.save(template);
  }

  async updateTemplate(
    name: string,
    dto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    await this.templateRepository.update({ name }, dto);

    const updatedTemplate = await this.templateRepository.findOne({
      where: { name },
    });

    if (!updatedTemplate) {
      throw new Error(`Template with name '${name}' not found`);
    }

    return updatedTemplate;
  }

  async getTemplate(
    name: string,
    language = 'en',
  ): Promise<NotificationTemplate | null> {
    return await this.templateRepository.findOne({
      where: { name, language, isActive: true },
    });
  }

  async getAllTemplates(): Promise<NotificationTemplate[]> {
    return await this.templateRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async deleteTemplate(name: string): Promise<boolean> {
    const result = await this.templateRepository.update(
      { name },
      { isActive: false },
    );

    return (result.affected ?? 0) > 0;
  }

  processTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
  ): { title: string; message: string; emailTemplate?: string } {
    let title = template.title;
    let message = template.message;
    let emailTemplate = template.emailTemplate;

    // Replace variables in all templates
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const replacement = String(value);

      title = title.replace(placeholder, replacement);
      message = message.replace(placeholder, replacement);

      if (emailTemplate) {
        emailTemplate = emailTemplate.replace(placeholder, replacement);
      }
    });

    return { title, message, emailTemplate };
  }
}
