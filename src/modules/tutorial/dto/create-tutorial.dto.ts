import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  TutorialType,
  TutorialCategory,
  TutorialDifficulty,
} from '../entities/tutorial.entity';
import {
  StepType,
  type InteractionType,
} from '../entities/tutorial-step.entity';
import { ProgressStatus } from '../entities/utorial-progress.entity';

export class CreateTutorialDto {
  @ApiProperty({ description: 'Tutorial title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Tutorial description' })
  @IsString()
  description!: string;

  @ApiProperty({ enum: TutorialType })
  @IsEnum(TutorialType)
  type!: TutorialType;

  @ApiProperty({ enum: TutorialCategory })
  @IsEnum(TutorialCategory)
  category!: TutorialCategory;

  @ApiProperty({ enum: TutorialDifficulty })
  @IsEnum(TutorialDifficulty)
  difficulty!: TutorialDifficulty;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDurationMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isSkippable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isAdaptive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  adaptiveSettings?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  accessibilityFeatures?: Record<string, any>;
}

export class CreateTutorialStepDto {
  @ApiProperty({ description: 'Step title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Step content' })
  @IsString()
  content!: string;

  @ApiProperty({ enum: StepType })
  @IsEnum(StepType)
  stepType!: StepType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  interactionConfig?: {
    type?: InteractionType;
    target?: string;
    expectedAction?: string;
    validation?: Record<string, any>;
    hints?: string[];
    maxAttempts?: number;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  mediaContent?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDurationSeconds?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCheckpoint?: boolean;
}

export class UpdateProgressDto {
  @ApiProperty({ enum: ProgressStatus })
  @IsEnum(ProgressStatus)
  status!: ProgressStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStepIndex?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSeconds?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  attempts?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hintsUsed?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  errorsCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  stepProgress?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  adaptiveData?: Record<string, any>;
}

export class SubmitFeedbackDto {
  @ApiProperty({ description: 'Overall rating', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  clarity?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  usefulness?: number;
}

export class TutorialSearchDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ required: false, enum: TutorialCategory })
  @IsOptional()
  @IsEnum(TutorialCategory)
  category?: TutorialCategory;

  @ApiProperty({ required: false, enum: TutorialDifficulty })
  @IsOptional()
  @IsEnum(TutorialDifficulty)
  difficulty?: TutorialDifficulty;

  @ApiProperty({ required: false, enum: TutorialType })
  @IsOptional()
  @IsEnum(TutorialType)
  type?: TutorialType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'orderIndex';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

export class StartTutorialDto {
  @ApiProperty({ description: 'Tutorial ID' })
  @IsUUID()
  tutorialId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  userPreferences?: {
    skipIntroduction?: boolean;
    preferredPace?: 'slow' | 'normal' | 'fast';
    accessibilityNeeds?: string[];
    language?: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}

export class StepInteractionDto {
  @ApiProperty({ description: 'Step ID' })
  @IsUUID()
  stepId!: string;

  @ApiProperty({ description: 'Interaction type' })
  @IsString()
  interactionType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  interactionData?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  attempts?: number;
}

export class CreateContextualHelpDto {
  @ApiProperty({ description: 'Help title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Help content' })
  @IsString()
  content!: string;

  @ApiProperty({ description: 'Game context' })
  @IsString()
  gameContext!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetElement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  displayConditions?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDismissible?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDisplayCount?: number;
}

export class TutorialRecommendationDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRecommendations?: number = 5;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  includeCompleted?: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];
}
