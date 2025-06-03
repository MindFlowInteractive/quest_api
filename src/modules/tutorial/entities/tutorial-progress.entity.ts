import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tutorial } from './tutorial.entity';
import { User } from '../../data-system/entities/user.entity';

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  PAUSED = 'paused',
  FAILED = 'failed',
}

@Entity('tutorial_progress')
@Index(['userId', 'status'])
@Index(['tutorialId', 'status'])
@Unique(['userId', 'tutorialId'])
export class TutorialProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ProgressStatus,
    default: ProgressStatus.NOT_STARTED,
  })
  status!: ProgressStatus;

  @Column({ default: 0 })
  currentStepIndex!: number;

  @Column({ default: 0 })
  completedSteps!: number;

  @Column({ default: 0 })
  totalSteps!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage!: number;

  @Column({ default: 0 })
  timeSpentSeconds!: number;

  @Column({ default: 0 })
  attempts!: number;

  @Column({ default: 0 })
  hintsUsed!: number;

  @Column({ default: 0 })
  errorsCount!: number;

  @Column({ type: 'json', nullable: true })
  stepProgress?: Record<
    string,
    {
      status: string;
      attempts: number;
      timeSpent: number;
      score?: number;
      errors?: string[];
    }
  >;

  @Column({ type: 'json', nullable: true })
  adaptiveData?: {
    learningPace?: 'slow' | 'normal' | 'fast';
    difficultyPreference?: 'easy' | 'normal' | 'hard';
    preferredLearningStyle?: 'visual' | 'auditory' | 'kinesthetic';
    strugglingAreas?: string[];
    strengths?: string[];
  };

  @Column({ nullable: true })
  lastAccessedAt!: Date;

  @Column({ nullable: true })
  completedAt!: Date;

  @Column({ nullable: true })
  pausedAt!: Date;

  @Column({ type: 'json', nullable: true })
  bookmarks?: string[]; // Step IDs bookmarked by user

  @Column({ type: 'json', nullable: true })
  feedback?: {
    rating?: number;
    comments?: string;
    difficulty?: number;
    clarity?: number;
    usefulness?: number;
  };

  @ManyToOne(() => Tutorial, (tutorial) => tutorial.progress)
  @JoinColumn({ name: 'tutorialId' })
  tutorial!: Tutorial;

  @Column('uuid')
  tutorialId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('uuid')
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
