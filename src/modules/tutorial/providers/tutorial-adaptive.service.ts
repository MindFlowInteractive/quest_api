import { Injectable, Logger } from '@nestjs/common';
import type { TutorialProgressService } from './tutorial-progress.service';
import type { TutorialAnalyticsService } from './tutorial-analytics.service';

export interface AdaptiveSettings {
  difficultyLevel: 'easy' | 'normal' | 'hard';
  pacingSpeed: 'slow' | 'normal' | 'fast';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  supportLevel: 'minimal' | 'moderate' | 'extensive';
  preferredInteractionTypes: string[];
}

export interface StepAdjustment {
  skipOptionalSteps?: boolean;
  addExtraExplanation?: boolean;
  simplifyInstructions?: boolean;
  provideAdditionalHints?: boolean;
  adjustTimeLimit?: number;
  changeInteractionType?: string;
}

@Injectable()
export class TutorialAdaptiveService {
  private readonly logger = new Logger(TutorialAdaptiveService.name);

  constructor(
    private progressService: TutorialProgressService,
    private analyticsService: TutorialAnalyticsService,
  ) {}

  async getUserAdaptiveSettings(
    userId: string,
    tutorialId: string,
  ): Promise<AdaptiveSettings> {
    const progress = await this.progressService.getUserProgress(
      userId,
      tutorialId,
    );

    if (progress?.adaptiveData) {
      return {
        difficultyLevel: progress.adaptiveData.difficultyPreference || 'normal',
        pacingSpeed: progress.adaptiveData.learningPace || 'normal',
        learningStyle: progress.adaptiveData.preferredLearningStyle || 'mixed',
        supportLevel: this.calculateSupportLevel(progress.adaptiveData),
        preferredInteractionTypes: Array.isArray(
          (progress.adaptiveData as any).preferredInteractionTypes,
        )
          ? (progress.adaptiveData as any).preferredInteractionTypes
          : [],
      };
    }

    // Generate initial adaptive settings based on user's learning pattern
    return this.generateInitialAdaptiveSettings(userId);
  }

  async updateAdaptiveSettings(
    userId: string,
    tutorialId: string,
    performanceData: {
      accuracy: number;
      speed: number;
      hintsUsed: number;
      errorsCount: number;
      timeSpent: number;
    },
  ): Promise<AdaptiveSettings> {
    const currentSettings = await this.getUserAdaptiveSettings(
      userId,
      tutorialId,
    );
    const adjustments = this.calculateAdjustments(
      performanceData,
      currentSettings,
    );

    const newAdaptiveData = {
      difficultyPreference: adjustments.difficultyLevel,
      learningPace: adjustments.pacingSpeed,
      preferredLearningStyle: adjustments.learningStyle,
      supportLevel: adjustments.supportLevel,
      preferredInteractionTypes: adjustments.preferredInteractionTypes,
      lastUpdated: new Date(),
    };

    await this.progressService.updateAdaptiveData(
      userId,
      tutorialId,
      newAdaptiveData,
    );

    return adjustments;
  }

  async getStepAdjustments(
    userId: string,
    tutorialId: string,
    stepId: string,
    interactionResult: any,
  ): Promise<StepAdjustment> {
    const settings = await this.getUserAdaptiveSettings(userId, tutorialId);
    const userPattern =
      await this.analyticsService.getUserLearningPattern(userId);

    const adjustments: StepAdjustment = {};

    // Adjust based on difficulty preference
    if (settings.difficultyLevel === 'easy') {
      adjustments.addExtraExplanation = true;
      adjustments.provideAdditionalHints = true;
      adjustments.simplifyInstructions = true;
    } else if (settings.difficultyLevel === 'hard') {
      adjustments.skipOptionalSteps = true;
    }

    // Adjust based on pacing
    if (settings.pacingSpeed === 'slow') {
      adjustments.adjustTimeLimit = 1.5; // 50% more time
    } else if (settings.pacingSpeed === 'fast') {
      adjustments.adjustTimeLimit = 0.75; // 25% less time
      adjustments.skipOptionalSteps = true;
    }

    // Adjust based on learning style
    if (settings.learningStyle === 'visual') {
      adjustments.changeInteractionType = 'visual_demonstration';
    } else if (settings.learningStyle === 'kinesthetic') {
      adjustments.changeInteractionType = 'hands_on_practice';
    }

    // Adjust based on recent performance
    if (interactionResult && !interactionResult.success) {
      adjustments.addExtraExplanation = true;
      adjustments.provideAdditionalHints = true;

      if (userPattern.strugglingAreas.length > 0) {
        adjustments.simplifyInstructions = true;
      }
    }

    return adjustments;
  }

  async recommendNextTutorials(
    userId: string,
    completedTutorialId: string,
  ): Promise<string[]> {
    const userPattern =
      await this.analyticsService.getUserLearningPattern(userId);
    const settings = await this.getUserAdaptiveSettings(
      userId,
      completedTutorialId,
    );

    // This would implement a recommendation algorithm based on:
    // - User's strengths and struggling areas
    // - Adaptive settings
    // - Tutorial prerequisites and relationships
    // - Other users with similar patterns

    // For now, return a simple recommendation
    return [];
  }

  async adjustTutorialDifficulty(
    userId: string,
    tutorialId: string,
    performanceMetrics: {
      completionRate: number;
      averageAttempts: number;
      timeEfficiency: number;
    },
  ): Promise<void> {
    let newDifficulty: 'easy' | 'normal' | 'hard' = 'normal';

    if (
      performanceMetrics.completionRate > 0.9 &&
      performanceMetrics.averageAttempts < 2
    ) {
      newDifficulty = 'hard';
    } else if (
      performanceMetrics.completionRate < 0.6 ||
      performanceMetrics.averageAttempts > 3
    ) {
      newDifficulty = 'easy';
    }

    await this.progressService.updateAdaptiveData(userId, tutorialId, {
      difficultyPreference: newDifficulty,
      lastDifficultyAdjustment: new Date(),
    });

    this.logger.log(
      `Adjusted difficulty to ${newDifficulty} for user ${userId} in tutorial ${tutorialId}`,
    );
  }

  async generatePersonalizedContent(
    userId: string,
    tutorialId: string,
    stepId: string,
  ): Promise<{
    content: string;
    mediaRecommendations: string[];
    interactionSuggestions: string[];
  }> {
    const settings = await this.getUserAdaptiveSettings(userId, tutorialId);
    const userPattern =
      await this.analyticsService.getUserLearningPattern(userId);

    // Generate content based on learning style and preferences
    let content = '';
    const mediaRecommendations: string[] = [];
    const interactionSuggestions: string[] = [];

    if (settings.learningStyle === 'visual') {
      mediaRecommendations.push(
        'diagram',
        'infographic',
        'video_demonstration',
      );
      content +=
        'Visual learners benefit from seeing the process step by step. ';
    } else if (settings.learningStyle === 'auditory') {
      mediaRecommendations.push('audio_explanation', 'narrated_walkthrough');
      content += 'Listen carefully to the audio instructions. ';
    } else if (settings.learningStyle === 'kinesthetic') {
      interactionSuggestions.push(
        'hands_on_practice',
        'drag_and_drop',
        'simulation',
      );
      content += 'Try the interactive elements to learn by doing. ';
    }

    if (settings.supportLevel === 'extensive') {
      content += 'Take your time and use hints whenever you need them. ';
      interactionSuggestions.push('guided_practice', 'step_by_step_hints');
    }

    return {
      content,
      mediaRecommendations,
      interactionSuggestions,
    };
  }

  private async generateInitialAdaptiveSettings(
    userId: string,
  ): Promise<AdaptiveSettings> {
    const userPattern =
      await this.analyticsService.getUserLearningPattern(userId);

    return {
      difficultyLevel: 'normal',
      pacingSpeed: userPattern.learningPace || 'normal',
      learningStyle: 'mixed',
      supportLevel: 'moderate',
      preferredInteractionTypes: [],
    };
  }

  private calculateAdjustments(
    performanceData: any,
    currentSettings: AdaptiveSettings,
  ): AdaptiveSettings {
    const adjustments = { ...currentSettings };

    // Adjust difficulty based on accuracy
    if (performanceData.accuracy > 0.9) {
      adjustments.difficultyLevel = 'hard';
    } else if (performanceData.accuracy < 0.6) {
      adjustments.difficultyLevel = 'easy';
    }

    // Adjust pacing based on speed
    if (performanceData.speed > 1.2) {
      // 20% faster than average
      adjustments.pacingSpeed = 'fast';
    } else if (performanceData.speed < 0.8) {
      // 20% slower than average
      adjustments.pacingSpeed = 'slow';
    }

    // Adjust support level based on hints and errors
    if (performanceData.hintsUsed > 3 || performanceData.errorsCount > 5) {
      adjustments.supportLevel = 'extensive';
    } else if (
      performanceData.hintsUsed === 0 &&
      performanceData.errorsCount < 2
    ) {
      adjustments.supportLevel = 'minimal';
    }

    return adjustments;
  }

  private calculateSupportLevel(
    adaptiveData: any,
  ): 'minimal' | 'moderate' | 'extensive' {
    const strugglingAreas = adaptiveData.strugglingAreas?.length || 0;
    const hintsUsage = adaptiveData.averageHintsUsed || 0;

    if (strugglingAreas > 2 || hintsUsage > 3) {
      return 'extensive';
    } else if (strugglingAreas > 0 || hintsUsage > 1) {
      return 'moderate';
    }
    return 'minimal';
  }
}
