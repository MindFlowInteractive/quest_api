import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import {
  type TutorialContent,
  ContentType,
  ContentStatus,
} from '../entities/tutorial-content.entity';
import type { Tutorial } from '../entities/tutorial.entity';
import type { TutorialStep } from '../entities/tutorial-step.entity';

export interface ContentTemplate {
  type: ContentType;
  template: string;
  variables: string[];
  defaultValues: Record<string, any>;
}

export interface ContentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

@Injectable()
export class TutorialContentService {
  private readonly logger = new Logger(TutorialContentService.name);

  private readonly contentTemplates: Record<string, ContentTemplate> = {
    basic_instruction: {
      type: ContentType.TEXT,
      template: 'In this step, you will learn to {action}. {description}',
      variables: ['action', 'description'],
      defaultValues: {
        action: 'complete the task',
        description: 'Follow the instructions carefully.',
      },
    },
    interactive_practice: {
      type: ContentType.INTERACTIVE,
      template: "Now it's your turn! {instruction} {hint}",
      variables: ['instruction', 'hint'],
      defaultValues: {
        instruction: 'Try the interactive element',
        hint: 'Use the hint if you need help.',
      },
    },
    quiz_question: {
      type: ContentType.QUIZ,
      template: '{question} Choose the correct answer from the options below.',
      variables: ['question'],
      defaultValues: { question: 'What did you learn in this tutorial?' },
    },
  };

  constructor(
    private contentRepository: Repository<TutorialContent>,
    private tutorialRepository: Repository<Tutorial>,
    private stepRepository: Repository<TutorialStep>,
  ) {}

  async createContent(
    tutorialId: string,
    stepId: string,
    contentData: {
      title: string;
      content: string;
      contentType: ContentType;
      language?: string;
      mediaUrls?: Record<string, string[]>;
      interactiveElements?: Record<string, any>;
    },
  ): Promise<TutorialContent> {
    const content = this.contentRepository.create({
      ...contentData,
      tutorialId,
      stepId,
      language: contentData.language || 'en',
      status: ContentStatus.DRAFT,
    });

    return this.contentRepository.save(content);
  }

  async generateContentFromTemplate(
    templateName: string,
    variables: Record<string, any>,
    tutorialId: string,
    stepId: string,
  ): Promise<TutorialContent> {
    const template = this.contentTemplates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Merge variables with defaults
    const allVariables = { ...template.defaultValues, ...variables };

    // Replace template variables
    let content = template.template;
    for (const [key, value] of Object.entries(allVariables)) {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return this.createContent(tutorialId, stepId, {
      title: `Generated from ${templateName}`,
      content,
      contentType: template.type,
    });
  }

  async validateContent(contentId: string): Promise<ContentValidation> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });
    if (!content) {
      throw new Error('Content not found');
    }

    const validation: ContentValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Basic validation
    if (!content.title || content.title.trim().length === 0) {
      validation.errors.push('Title is required');
      validation.isValid = false;
    }

    if (!content.content || content.content.trim().length === 0) {
      validation.errors.push('Content is required');
      validation.isValid = false;
    }

    // Length validation
    if (content.title && content.title.length > 100) {
      validation.warnings.push('Title is quite long, consider shortening it');
    }

    if (content.content && content.content.length > 5000) {
      validation.warnings.push(
        'Content is very long, consider breaking it into smaller steps',
      );
    }

    // Content type specific validation
    switch (content.contentType) {
      case ContentType.INTERACTIVE:
        if (
          !content.interactiveElements ||
          Object.keys(content.interactiveElements).length === 0
        ) {
          validation.warnings.push(
            'Interactive content should have interactive elements defined',
          );
        }
        break;
      case ContentType.VIDEO:
      case ContentType.AUDIO:
        if (
          !content.mediaUrls ||
          (content.contentType === ContentType.VIDEO &&
            !content.mediaUrls.videos) ||
          (content.contentType === ContentType.AUDIO &&
            !content.mediaUrls.audio)
        ) {
          validation.errors.push(
            `${content.contentType} content requires media URLs`,
          );
          validation.isValid = false;
        }
        break;
      case ContentType.QUIZ:
        if (!content.content.includes('?')) {
          validation.warnings.push('Quiz content should contain questions');
        }
        break;
    }

    // Accessibility validation
    if (
      content.contentType === ContentType.IMAGE &&
      !content.accessibility?.altText
    ) {
      validation.warnings.push('Images should have alt text for accessibility');
    }

    if (
      content.contentType === ContentType.VIDEO &&
      !content.accessibility?.captions
    ) {
      validation.warnings.push('Videos should have captions for accessibility');
    }

    // SEO and readability suggestions
    if (content.content) {
      const wordCount = content.content.split(/\s+/).length;
      if (wordCount < 10) {
        validation.suggestions.push('Consider adding more detailed content');
      } else if (wordCount > 500) {
        validation.suggestions.push(
          'Consider breaking this into multiple steps',
        );
      }

      // Check for action words
      const actionWords = [
        'click',
        'select',
        'choose',
        'enter',
        'type',
        'drag',
        'drop',
      ];
      const hasActionWords = actionWords.some((word) =>
        content.content.toLowerCase().includes(word),
      );

      if (!hasActionWords && content.contentType === ContentType.INTERACTIVE) {
        validation.suggestions.push(
          'Interactive content should include clear action instructions',
        );
      }
    }

    return validation;
  }

  async publishContent(contentId: string): Promise<TutorialContent> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });
    if (!content) {
      throw new Error('Content not found');
    }

    // Validate before publishing
    const validation = await this.validateContent(contentId);
    if (!validation.isValid) {
      throw new Error(
        `Cannot publish content with errors: ${validation.errors.join(', ')}`,
      );
    }

    content.status = ContentStatus.PUBLISHED;
    content.publishedAt = new Date();

    return this.contentRepository.save(content);
  }

  async archiveContent(contentId: string): Promise<TutorialContent> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });
    if (!content) {
      throw new Error('Content not found');
    }

    content.status = ContentStatus.ARCHIVED;
    content.archivedAt = new Date();

    return this.contentRepository.save(content);
  }

  async duplicateContent(
    contentId: string,
    targetTutorialId?: string,
    targetStepId?: string,
  ): Promise<TutorialContent> {
    const originalContent = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!originalContent) {
      throw new Error('Content not found');
    }

    // Explicitly pick only the entity's data fields
    const {
      id,
      tutorialId,
      stepId,
      title,
      content,
      contentType,
      language,
      mediaUrls,
      interactiveElements,
      accessibility,
      status,
      publishedAt,
      archivedAt,
      createdAt,
      updatedAt,
      // add any other fields defined in TutorialContent entity
    } = originalContent;

    const duplicatedContent = this.contentRepository.create({
      ...(targetTutorialId
        ? { tutorialId: targetTutorialId }
        : tutorialId
          ? { tutorialId }
          : {}),
      ...(targetStepId ? { stepId: targetStepId } : stepId ? { stepId } : {}),
      title: `${title} (Copy)`,
      content,
      contentType,
      language,
      mediaUrls,
      interactiveElements,
      accessibility,
      status: ContentStatus.DRAFT,
      // do not include id, createdAt, updatedAt, publishedAt, archivedAt
    } as Partial<TutorialContent>);

    const saved = await this.contentRepository.save(duplicatedContent);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async getContentByTutorial(
    tutorialId: string,
    language = 'en',
  ): Promise<TutorialContent[]> {
    return this.contentRepository.find({
      where: {
        tutorialId,
        language,
        status: ContentStatus.PUBLISHED,
      },
      order: { stepId: 'ASC' },
    });
  }

  async updateContent(
    contentId: string,
    updates: Partial<{
      title: string;
      content: string;
      mediaUrls: Record<string, string[]>;
      interactiveElements: Record<string, any>;
      accessibility: Record<string, any>;
    }>,
  ): Promise<TutorialContent> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });
    if (!content) {
      throw new Error('Content not found');
    }

    Object.assign(content, updates);
    return this.contentRepository.save(content);
  }

  async getContentTemplates(): Promise<Record<string, ContentTemplate>> {
    return this.contentTemplates;
  }

  async bulkCreateContent(
    tutorialId: string,
    contentItems: Array<{
      stepId: string;
      title: string;
      content: string;
      contentType: ContentType;
      language?: string;
    }>,
  ): Promise<TutorialContent[]> {
    const contents = contentItems.map((item) =>
      this.contentRepository.create({
        tutorialId,
        stepId: item.stepId,
        title: item.title,
        content: item.content,
        contentType: item.contentType,
        language: item.language || 'en',
        status: ContentStatus.DRAFT,
      }),
    );

    const savedContents = await this.contentRepository.save(contents);

    // Ensure the return type is always an array
    return Array.isArray(savedContents) ? savedContents : [savedContents];
  }
}
