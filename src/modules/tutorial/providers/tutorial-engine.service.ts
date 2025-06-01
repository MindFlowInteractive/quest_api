import { Injectable, Logger } from '@nestjs/common';
import type { TutorialProgressService } from './tutorial-progress.service';
import type { TutorialAnalyticsService } from './tutorial-analytics.service';
import type { TutorialStep } from '../entities/tutorial-step.entity';
import { TutorialAdaptiveService } from './tutorial-adaptive.service';
import { StepInteractionDto } from '../dto/create-tutorial.dto';
import { AnalyticsEventType } from '../entities/tutorial-analytics.entity';

export interface InteractionResult {
  success: boolean;
  feedback: string;
  nextAction: 'continue' | 'retry' | 'hint' | 'skip';
  score?: number;
  hints?: string[];
  adaptiveAdjustments?: Record<string, any>;
}

export interface TutorialState {
  currentStep: TutorialStep;
  progress: number;
  canSkip: boolean;
  hintsAvailable: number;
  timeRemaining?: number;
  adaptiveSettings: Record<string, any>;
}

@Injectable()
export class TutorialEngineService {
  private readonly logger = new Logger(TutorialEngineService.name);

  constructor(
    private progressService: TutorialProgressService,
    private analyticsService: TutorialAnalyticsService,
    private adaptiveService: TutorialAdaptiveService,
  ) {}

  async processStepInteraction(
    userId: string,
    tutorialId: string,
    interactionDto: StepInteractionDto,
  ): Promise<InteractionResult> {
    try {
      // Get current tutorial state
      const progress = await this.progressService.getUserProgress(
        userId,
        tutorialId,
      );
      if (!progress) {
        throw new Error('Tutorial progress not found');
      }

      // Validate interaction
      const validationResult = await this.validateInteraction(interactionDto);

      // Record interaction analytics
      await this.analyticsService.recordEvent(
        validationResult.success
          ? ('step_completed' as any)
          : ('error_occurred' as any),
        userId,
        tutorialId,
        interactionDto.stepId,
        undefined,
        {
          interactionType: interactionDto.interactionType,
          timeSpent: interactionDto.timeSpent,
          attempts: interactionDto.attempts,
          isCorrect: interactionDto.isCorrect,
        },
      );

      // Update step progress
      await this.updateStepProgress(
        userId,
        tutorialId,
        interactionDto,
        validationResult.success,
      );

      // Get adaptive adjustments if needed
      const adaptiveAdjustments = await this.adaptiveService.getStepAdjustments(
        userId,
        tutorialId,
        interactionDto.stepId,
        validationResult,
      );

      return {
        ...validationResult,
        adaptiveAdjustments,
      };
    } catch (error) {
      this.logger.error('Failed to process step interaction:', error);
      return {
        success: false,
        feedback: 'An error occurred while processing your interaction.',
        nextAction: 'retry',
      };
    }
  }

  async getCurrentTutorialState(
    userId: string,
    tutorialId: string,
  ): Promise<TutorialState> {
    const progress = await this.progressService.getUserProgress(
      userId,
      tutorialId,
    );
    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    const tutorial = progress.tutorial;
    const currentStep = tutorial.steps[progress.currentStepIndex];

    if (!currentStep) {
      throw new Error('Current step not found');
    }

    const adaptiveSettings = await this.adaptiveService.getUserAdaptiveSettings(
      userId,
      tutorialId,
    );

    return {
      currentStep,
      progress: progress.completionPercentage,
      canSkip: tutorial.isSkippable && currentStep.isOptional,
      hintsAvailable: this.calculateAvailableHints(currentStep, progress),
      timeRemaining: this.calculateTimeRemaining(tutorial, progress),
      adaptiveSettings,
    };
  }

  async provideHint(
    userId: string,
    tutorialId: string,
    stepId: string,
  ): Promise<{ hint: string; hintsRemaining: number }> {
    const progress = await this.progressService.getUserProgress(
      userId,
      tutorialId,
    );
    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    const step = progress.tutorial.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    const hints = step.interactionConfig?.hints || [];
    const hintsUsed = progress.hintsUsed || 0;

    if (hintsUsed >= hints.length) {
      throw new Error('No more hints available');
    }

    const hint = hints[hintsUsed];

    // Update progress
    await this.progressService.updateProgress(userId, tutorialId, {
      status: progress.status,
      hintsUsed: hintsUsed + 1,
    });

    // Record analytics
    await this.analyticsService.recordEvent(
      'hint_used' as AnalyticsEventType,
      userId,
      tutorialId,
      stepId,
      undefined,
      {
        hintIndex: hintsUsed,
        hint,
      },
    );

    return {
      hint,
      hintsRemaining: hints.length - hintsUsed - 1,
    };
  }

  async skipStep(
    userId: string,
    tutorialId: string,
    stepId: string,
  ): Promise<{ success: boolean; nextStep?: TutorialStep }> {
    const progress = await this.progressService.getUserProgress(
      userId,
      tutorialId,
    );
    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    const tutorial = progress.tutorial;
    const currentStep = tutorial.steps[progress.currentStepIndex];

    if (!currentStep || currentStep.id !== stepId) {
      throw new Error('Invalid step to skip');
    }

    if (!tutorial.isSkippable && !currentStep.isOptional) {
      throw new Error('This step cannot be skipped');
    }

    // Move to next step
    const nextStepIndex = progress.currentStepIndex + 1;
    const nextStep = tutorial.steps[nextStepIndex];

    await this.progressService.updateProgress(userId, tutorialId, {
      status: progress.status,
      currentStepIndex: nextStepIndex,
    });

    // Record analytics
    await this.analyticsService.recordEvent(
      'step_skipped' as AnalyticsEventType,
      userId,
      tutorialId,
      stepId,
      undefined,
      {
        stepIndex: progress.currentStepIndex,
      },
    );

    return {
      success: true,
      nextStep,
    };
  }

  async restartTutorial(userId: string, tutorialId: string): Promise<void> {
    const progress = await this.progressService.getUserProgress(
      userId,
      tutorialId,
    );
    if (!progress) {
      throw new Error('Tutorial progress not found');
    }

    await this.progressService.updateProgress(userId, tutorialId, {
      status: progress.status,
      currentStepIndex: 0,
      timeSpentSeconds: 0,
      attempts: 0,
      hintsUsed: 0,
      errorsCount: 0,
      stepProgress: {},
    });

    // Record analytics
    await this.analyticsService.recordEvent(
      'tutorial_restarted' as AnalyticsEventType,
      userId,
      tutorialId,
      undefined,
      undefined,
      {
        previousProgress: progress.completionPercentage,
      },
    );
  }

  private async validateInteraction(
    interactionDto: StepInteractionDto,
  ): Promise<{
    success: boolean;
    feedback: string;
    nextAction: 'continue' | 'retry' | 'hint' | 'skip';
    score?: number;
    hints?: string[];
  }> {
    // This would contain the actual validation logic based on the step type and interaction
    // For now, we'll provide a basic implementation

    const { interactionType, interactionData, isCorrect } = interactionDto;

    if (isCorrect === true) {
      return {
        success: true,
        feedback: 'Great job! You completed this step correctly.',
        nextAction: 'continue',
        score: 100,
      };
    } else if (isCorrect === false) {
      return {
        success: false,
        feedback: "That's not quite right. Try again or use a hint.",
        nextAction: 'retry',
        hints: [
          'Try looking at the highlighted area',
          'Remember the previous step',
        ],
      };
    }

    // For interactions without explicit correct/incorrect (like demonstrations)
    return {
      success: true,
      feedback: 'Step completed.',
      nextAction: 'continue',
    };
  }

  private async updateStepProgress(
    userId: string,
    tutorialId: string,
    interactionDto: StepInteractionDto,
    success: boolean,
  ): Promise<void> {
    const progress = await this.progressService.getUserProgress(
      userId,
      tutorialId,
    );
    if (!progress) return;

    const stepProgress = progress.stepProgress || {};
    const stepId = interactionDto.stepId;

    if (!stepProgress[stepId]) {
      stepProgress[stepId] = {
        status: 'in_progress',
        attempts: 0,
        timeSpent: 0,
        errors: [],
      };
    }

    const currentStepProgress = stepProgress[stepId];
    currentStepProgress.attempts = interactionDto.attempts || 0;
    currentStepProgress.timeSpent += interactionDto.timeSpent || 0;

    if (success) {
      currentStepProgress.status = 'completed';

      // Move to next step if this was the current step
      const tutorial = progress.tutorial;
      const currentStep = tutorial.steps[progress.currentStepIndex];

      if (currentStep && currentStep.id === stepId) {
        await this.progressService.updateProgress(userId, tutorialId, {
          status: progress.status,
          currentStepIndex: progress.currentStepIndex + 1,
          stepProgress,
        });
      }
    } else {
      if (!currentStepProgress.errors) {
        currentStepProgress.errors = [];
      }
      currentStepProgress.errors.push(
        `Attempt ${currentStepProgress.attempts}: Incorrect interaction`,
      );

      await this.progressService.updateProgress(userId, tutorialId, {
        status: progress.status,
        errorsCount: progress.errorsCount + 1,
        stepProgress,
      });
    }
  }

  private calculateAvailableHints(step: TutorialStep, progress: any): number {
    const totalHints = step.interactionConfig?.hints?.length || 0;
    const hintsUsed = progress.hintsUsed || 0;
    return Math.max(0, totalHints - hintsUsed);
  }

  private calculateTimeRemaining(
    tutorial: any,
    progress: any,
  ): number | undefined {
    if (!tutorial.estimatedDurationMinutes) return undefined;

    const estimatedSeconds = tutorial.estimatedDurationMinutes * 60;
    const timeSpent = progress.timeSpentSeconds || 0;
    return Math.max(0, estimatedSeconds - timeSpent);
  }
}
