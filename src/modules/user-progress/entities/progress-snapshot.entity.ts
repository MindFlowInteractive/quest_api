import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { UserProgress } from './user-progress.entity';
import { User } from '../../user/entities/user.entity';

export enum SnapshotType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  MILESTONE = 'milestone',
  BACKUP = 'backup',
}

@Entity('progress_snapshots')
@Index(['userId', 'type', 'snapshotDate'])
export class ProgressSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => UserProgress, (progress) => progress.snapshots, {
    onDelete: 'CASCADE',
  })
  userProgress: UserProgress;

  @Column({
    type: 'enum',
    enum: SnapshotType,
  })
  type: SnapshotType;

  @Column('timestamp')
  snapshotDate: Date;

  @Column('jsonb')
  data: {
    totalPuzzlesCompleted: number;
    totalPuzzlesSolved: number;
    experiencePoints: number;
    currentLevel: number;
    currentDailyStreak: number;
    difficultyStats: any;
    categoryStats: any;
    achievements: number;
    timeSpent: number;
  };

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
