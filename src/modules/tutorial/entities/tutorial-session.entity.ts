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
import { User } from '../../data-system/entities/user.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  PAUSED = 'paused',
}

@Entity('tutorial_sessions')
@Index(['userId', 'status'])
@Index(['tutorialId', 'startedAt'])
export class TutorialSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status!: SessionStatus;

  @Column()
  startedAt!: Date;

  @Column({ nullable: true })
  endedAt!: Date;

  @Column({ default: 0 })
  durationSeconds!: number;

  @Column({ default: 0 })
  stepsCompleted!: number;

  @Column({ default: 0 })
  interactionsCount!: number;

  @Column({ default: 0 })
  errorsCount!: number;

  @Column({ default: 0 })
  hintsUsed!: number;

  @Column({ type: 'json', nullable: true })
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    screenResolution?: string;
    inputMethod?: string;
  };

  @Column({ type: 'json', nullable: true })
  performanceMetrics?: {
    averageStepTime?: number;
    fastestStep?: number;
    slowestStep?: number;
    accuracyRate?: number;
  };

  @Column({ type: 'json', nullable: true })
  sessionData?: Record<string, any>;

  @ManyToOne(() => Tutorial)
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
