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
import { Puzzle } from './puzzle.entity';
import { User } from '@/user/entities/user.entity';

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('puzzle_progress')
@Index(['userId', 'puzzleId'], { unique: true })
@Index(['userId', 'status'])
@Index(['completedAt'])
export class PuzzleProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  puzzleId: string;

  @Column({
    type: 'enum',
    enum: ProgressStatus,
    default: ProgressStatus.NOT_STARTED,
  })
  status: ProgressStatus;

  @Column({ type: 'int', default: 0 })
  currentScore: number;

  @Column({ type: 'int', default: 0 })
  bestScore: number;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', default: 0 })
  hintsUsed: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  bestTime: number; // in seconds

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  totalTimeSpent: number; // in seconds

  @Column({ type: 'json', nullable: true })
  currentState: any; // Save current puzzle state

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastPlayedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.puzzleProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Puzzle, (puzzle) => puzzle.userProgress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'puzzleId' })
  puzzle: Puzzle;
}
