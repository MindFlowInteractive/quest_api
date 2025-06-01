import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AnalyticsEventType {
  TUTORIAL_STARTED = 'tutorial_started',
  TUTORIAL_COMPLETED = 'tutorial_completed',
  TUTORIAL_SKIPPED = 'tutorial_skipped',
  TUTORIAL_ABANDONED = 'tutorial_abandoned',
  STEP_COMPLETED = 'step_completed',
  STEP_FAILED = 'step_failed',
  HINT_USED = 'hint_used',
  ERROR_OCCURRED = 'error_occurred',
  FEEDBACK_SUBMITTED = 'feedback_submitted',
  BOOKMARK_ADDED = 'bookmark_added',
  HELP_ACCESSED = 'help_accessed',
}

@Entity('tutorial_analytics')
@Index(['eventType', 'createdAt'])
@Index(['tutorialId', 'eventType'])
@Index(['userId', 'createdAt'])
export class TutorialAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: AnalyticsEventType })
  eventType!: AnalyticsEventType;

  @Column('uuid')
  userId!: string;

  @Column('uuid', { nullable: true })
  tutorialId?: string;

  @Column('uuid', { nullable: true })
  stepId?: string;

  @Column('uuid', { nullable: true })
  sessionId?: string;

  @Column({ type: 'json', nullable: true })
  eventData?: {
    stepIndex?: number;
    timeSpent?: number;
    attempts?: number;
    errorType?: string;
    rating?: number;
    comments?: string;
    categories?: Array<string>;
    area?: string;
    hintType?: string;
    interactionType?: string;
    deviceInfo?: Record<string, any>;
    customData?: Record<string, any>;
  };

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
