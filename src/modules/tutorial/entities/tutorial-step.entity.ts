import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tutorial } from './tutorial.entity';

export enum StepType {
  INSTRUCTION = 'instruction',
  INTERACTION = 'interaction',
  PRACTICE = 'practice',
  QUIZ = 'quiz',
  DEMONSTRATION = 'demonstration',
  CHECKPOINT = 'checkpoint',
}

export enum InteractionType {
  CLICK = 'click',
  DRAG_DROP = 'drag_drop',
  INPUT = 'input',
  SELECTION = 'selection',
  GESTURE = 'gesture',
  VOICE = 'voice',
}

@Entity('tutorial_steps')
@Index(['tutorialId', 'orderIndex'])
export class TutorialStep {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column({ type: 'enum', enum: StepType })
  stepType!: StepType;

  @Column({ default: 0 })
  orderIndex!: number;

  @Column({ type: 'json', nullable: true })
  interactionConfig?: {
    type?: InteractionType;
    target?: string;
    expectedAction?: string;
    validation?: Record<string, any>;
    hints?: string[];
    maxAttempts?: number;
  };

  @Column({ type: 'json', nullable: true })
  mediaContent?: {
    images?: string[];
    videos?: string[];
    audio?: string[];
    animations?: string[];
  };

  @Column({ type: 'json', nullable: true })
  localization?: Record<
    string,
    {
      title?: string;
      content?: string;
      hints?: string[];
    }
  >;

  @Column({ type: 'json', nullable: true })
  conditions?: {
    showIf?: Record<string, any>;
    skipIf?: Record<string, any>;
    requiredSkills?: string[];
  };

  @Column({ default: 0 })
  estimatedDurationSeconds!: number;

  @Column({ default: false })
  isOptional!: boolean;

  @Column({ default: false })
  isCheckpoint!: boolean;

  @Column({ type: 'json', nullable: true })
  successCriteria?: {
    minAccuracy?: number;
    maxTime?: number;
    requiredActions?: string[];
  };

  @Column({ type: 'json', nullable: true })
  adaptiveRules?: {
    onSuccess?: Record<string, any>;
    onFailure?: Record<string, any>;
    difficultyAdjustment?: Record<string, any>;
  };

  @ManyToOne(() => Tutorial, (tutorial) => tutorial.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tutorialId' })
  tutorial!: Tutorial;

  @Column('uuid')
  tutorialId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
