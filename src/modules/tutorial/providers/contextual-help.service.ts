import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type {
  ContextualHelp,
  TriggerType,
} from '../entities/contextual-help.entity';
import type { TutorialAnalyticsService } from './tutorial-analytics.service';
import { AnalyticsEventType } from '../entities/tutorial-analytics.entity';
import { CreateContextualHelpDto } from '../dto/create-tutorial.dto';

export interface HelpContext {
  gameState: Record<string, any>;
  userLevel: string;
  completedTutorials: string[];
  currentScreen: string;
  timeInGame: number;
}

@Injectable()
export class ContextualHelpService {
  private readonly logger = new Logger(ContextualHelpService.name);

  constructor(
    private helpRepository: Repository<ContextualHelp>,
    private analyticsService: TutorialAnalyticsService,
  ) {}

  async createContextualHelp(
    createDto: CreateContextualHelpDto,
  ): Promise<ContextualHelp> {
    const help = this.helpRepository.create(createDto);
    return this.helpRepository.save(help);
  }

  async getContextualHelp(
    gameContext: string,
    userContext: HelpContext,
    language = 'en',
  ): Promise<ContextualHelp[]> {
    const helpItems = await this.helpRepository.find({
      where: {
        gameContext,
        isActive: true,
      },
      order: { priority: 'DESC' },
    });

    // Filter based on display conditions
    const filteredHelp = helpItems.filter((help) =>
      this.shouldDisplayHelp(help, userContext),
    );

    // Localize content
    const localizedHelp = filteredHelp.map((help) =>
      this.localizeHelp(help, language),
    );

    // Update display analytics
    for (const help of localizedHelp) {
      await this.updateDisplayAnalytics(help.id);
    }

    return localizedHelp;
  }

  async getHelpByTrigger(
    triggerType: TriggerType,
    targetElement: string,
    userContext: HelpContext,
    language = 'en',
  ): Promise<ContextualHelp[]> {
    const helpItems = await this.helpRepository.find({
      where: {
        triggerType,
        targetElement,
        isActive: true,
      },
      order: { priority: 'DESC' },
    });

    return helpItems
      .filter((help) => this.shouldDisplayHelp(help, userContext))
      .map((help) => this.localizeHelp(help, language));
  }

  async recordHelpInteraction(
    helpId: string,
    userId: string,
    interactionType: 'view' | 'click' | 'dismiss',
    viewTime?: number,
  ): Promise<void> {
    // Update help analytics
    const help = await this.helpRepository.findOne({ where: { id: helpId } });
    if (!help) return;

    if (!help.analytics) {
      help.analytics = {
        displayCount: 0,
        clickCount: 0,
        dismissCount: 0,
        averageViewTime: 0,
      };
    }

    switch (interactionType) {
      case 'view':
        help.analytics.displayCount = (help.analytics.displayCount || 0) + 1;
        break;
      case 'click':
        help.analytics.clickCount = (help.analytics.clickCount || 0) + 1;
        break;
      case 'dismiss':
        help.analytics.dismissCount = (help.analytics.dismissCount || 0) + 1;
        break;
    }

    if (viewTime && interactionType === 'view') {
      const currentAvg = help.analytics.averageViewTime || 0;
      const displayCount = help.analytics.displayCount || 1;
      help.analytics.averageViewTime =
        (currentAvg * (displayCount - 1) + viewTime) / displayCount;
    }

    await this.helpRepository.save(help);

    // Record in analytics system
    await this.analyticsService.recordEvent(
      'help_accessed' as AnalyticsEventType,
      userId,
      undefined,
      undefined,
      undefined,
      {
        helpId,
        interactionType,
        viewTime,
        gameContext: help.gameContext,
      },
    );
  }

  async getSmartHelp(
    userContext: HelpContext,
    strugglingArea?: string,
    language = 'en',
  ): Promise<ContextualHelp[]> {
    // Get help based on user's current struggles or context
    let gameContext = userContext.currentScreen;

    if (strugglingArea) {
      gameContext = strugglingArea;
    }

    const helpItems = await this.getContextualHelp(
      gameContext,
      userContext,
      language,
    );

    // Sort by relevance to user's current situation
    return helpItems.sort((a, b) => {
      const aRelevance = this.calculateRelevance(
        a,
        userContext,
        strugglingArea,
      );
      const bRelevance = this.calculateRelevance(
        b,
        userContext,
        strugglingArea,
      );
      return bRelevance - aRelevance;
    });
  }

  async updateHelpContent(
    helpId: string,
    updates: Partial<CreateContextualHelpDto>,
  ): Promise<ContextualHelp> {
    const help = await this.helpRepository.findOne({ where: { id: helpId } });
    if (!help) {
      throw new Error('Help item not found');
    }

    Object.assign(help, updates);
    return this.helpRepository.save(help);
  }

  async deactivateHelp(helpId: string): Promise<void> {
    await this.helpRepository.update(helpId, { isActive: false });
  }

  async getHelpAnalytics(helpId: string): Promise<{
    displayCount: number;
    clickCount: number;
    dismissCount: number;
    averageViewTime: number;
    effectivenessScore: number;
  }> {
    const help = await this.helpRepository.findOne({ where: { id: helpId } });
    if (!help || !help.analytics) {
      return {
        displayCount: 0,
        clickCount: 0,
        dismissCount: 0,
        averageViewTime: 0,
        effectivenessScore: 0,
      };
    }

    const analytics = help.analytics;
    const effectivenessScore = this.calculateEffectivenessScore(analytics);

    return {
      displayCount: analytics.displayCount || 0,
      clickCount: analytics.clickCount || 0,
      dismissCount: analytics.dismissCount || 0,
      averageViewTime: analytics.averageViewTime || 0,
      effectivenessScore,
    };
  }

  async getPopularHelpTopics(gameContext?: string): Promise<
    Array<{
      helpId: string;
      title: string;
      accessCount: number;
      effectivenessScore: number;
    }>
  > {
    const whereCondition: any = { isActive: true };
    if (gameContext) {
      whereCondition.gameContext = gameContext;
    }

    const helpItems = await this.helpRepository.find({
      where: whereCondition,
    });

    return helpItems
      .map((help) => ({
        helpId: help.id,
        title: help.title,
        accessCount: help.analytics?.displayCount || 0,
        effectivenessScore: this.calculateEffectivenessScore(
          help.analytics || {},
        ),
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
  }

  private shouldDisplayHelp(
    help: ContextualHelp,
    userContext: HelpContext,
  ): boolean {
    if (!help.displayConditions) {
      return true;
    }

    const conditions = help.displayConditions;

    // Check user level
    if (
      conditions.userLevel &&
      conditions.userLevel !== userContext.userLevel
    ) {
      return false;
    }

    // Check completed tutorials
    if (conditions.completedTutorials) {
      const hasRequiredTutorials = conditions.completedTutorials.every(
        (tutorialId) => userContext.completedTutorials.includes(tutorialId),
      );
      if (!hasRequiredTutorials) {
        return false;
      }
    }

    // Check time in game
    if (
      conditions.timeInGame &&
      userContext.timeInGame < conditions.timeInGame
    ) {
      return false;
    }

    // Check game state conditions
    if (conditions.gameState) {
      for (const [key, value] of Object.entries(conditions.gameState)) {
        if (userContext.gameState[key] !== value) {
          return false;
        }
      }
    }

    // Check display count limit
    if (help.maxDisplayCount > 0) {
      const displayCount = help.analytics?.displayCount || 0;
      if (displayCount >= help.maxDisplayCount) {
        return false;
      }
    }

    return true;
  }

  private localizeHelp(help: ContextualHelp, language: string): ContextualHelp {
    if (!help.localization || !help.localization[language]) {
      return help;
    }

    const localized = { ...help };
    const translation = help.localization[language];

    if (translation.title) {
      localized.title = translation.title;
    }
    if (translation.content) {
      localized.content = translation.content;
    }

    return localized;
  }

  private async updateDisplayAnalytics(helpId: string): Promise<void> {
    await this.helpRepository.increment(
      { id: helpId },
      'analytics.displayCount',
      1,
    );
  }

  private calculateRelevance(
    help: ContextualHelp,
    userContext: HelpContext,
    strugglingArea?: string,
  ): number {
    let relevance = help.priority;

    // Boost relevance if it matches struggling area
    if (strugglingArea && help.gameContext === strugglingArea) {
      relevance += 50;
    }

    // Boost relevance based on user level appropriateness
    if (help.displayConditions?.userLevel === userContext.userLevel) {
      relevance += 20;
    }

    // Reduce relevance if shown too many times
    const displayCount = help.analytics?.displayCount || 0;
    if (displayCount > 5) {
      relevance -= displayCount * 2;
    }

    return relevance;
  }

  private calculateEffectivenessScore(analytics: any): number {
    const displayCount = analytics.displayCount || 0;
    const clickCount = analytics.clickCount || 0;
    const dismissCount = analytics.dismissCount || 0;
    const averageViewTime = analytics.averageViewTime || 0;

    if (displayCount === 0) return 0;

    const clickRate = clickCount / displayCount;
    const dismissRate = dismissCount / displayCount;
    const engagementScore = averageViewTime > 5 ? 1 : averageViewTime / 5;

    // Calculate effectiveness (0-100)
    const effectiveness =
      clickRate * 40 + engagementScore * 30 + (1 - dismissRate) * 30;

    return Math.min(100, Math.max(0, effectiveness * 100));
  }
}
