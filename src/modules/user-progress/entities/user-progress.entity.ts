import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserAchievement } from './user-achievement.entity';
import { ProgressSnapshot } from './progress-snapshot.entity';

export enum StreakType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master',
}

@Entity('user_progress')
@Index(['userId'])
@Index(['lastActiveDate'])
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  // Overall Statistics
  @Column('int', { default: 0 })
  totalPuzzlesAttempted: number;

  @Column('int', { default: 0 })
  totalPuzzlesCompleted: number;

  @Column('int', { default: 0 })
  totalPuzzlesSolved: number;

  @Column('float', { default: 0 })
  overallSuccessRate: number;

  @Column('int', { default: 0 })
  totalTimeSpent: number; // in seconds

  @Column('int', { default: 0 })
  averageCompletionTime: number; // in seconds

  // Difficulty-based Statistics
  @Column('jsonb', {
    default: {
      easy: { attempted: 0, completed: 0, solved: 0, averageTime: 0 },
      medium: { attempted: 0, completed: 0, solved: 0, averageTime: 0 },
      hard: { attempted: 0, completed: 0, solved: 0, averageTime: 0 },
      expert: { attempted: 0, completed: 0, solved: 0, averageTime: 0 },
    },
  })
  difficultyStats: {
    easy: {
      attempted: number;
      completed: number;
      solved: number;
      averageTime: number;
    };
    medium: {
      attempted: number;
      completed: number;
      solved: number;
      averageTime: number;
    };
    hard: {
      attempted: number;
      completed: number;
      solved: number;
      averageTime: number;
    };
    expert: {
      attempted: number;
      completed: number;
      solved: number;
      averageTime: number;
    };
  };

  // Category-based Performance
  @Column('jsonb', { default: {} })
  categoryStats: Record<
    string,
    {
      attempted: number;
      completed: number;
      solved: number;
      averageTime: number;
      successRate: number;
    }
  >;

  // Streak Information
  @Column('int', { default: 0 })
  currentDailyStreak: number;

  @Column('int', { default: 0 })
  longestDailyStreak: number;

  @Column('int', { default: 0 })
  currentWeeklyStreak: number;

  @Column('int', { default: 0 })
  longestWeeklyStreak: number;

  @Column('timestamp', { nullable: true })
  lastActiveDate: Date;

  @Column('timestamp', { nullable: true })
  streakStartDate: Date;

  // Skill Assessment
  @Column({
    type: 'enum',
    enum: SkillLevel,
    default: SkillLevel.BEGINNER,
  })
  currentSkillLevel: SkillLevel;

  @Column('int', { default: 0 })
  experiencePoints: number;

  @Column('int', { default: 1 })
  currentLevel: number;

  @Column('int', { default: 0 })
  pointsToNextLevel: number;

  // Performance Metrics
  @Column('float', { default: 0 })
  averageRatingGiven: number;

  @Column('int', { default: 0 })
  totalHintsUsed: number;

  @Column('int', { default: 0 })
  perfectSolves: number; // Solved without hints

  @Column('float', { default: 0 })
  improvementRate: number; // Rate of improvement over time

  // Time-based Analytics
  @Column('jsonb', { default: {} })
  dailyActivity: Record<
    string,
    {
      puzzlesAttempted: number;
      puzzlesCompleted: number;
      timeSpent: number;
      date: string;
    }
  >;

  @Column('jsonb', { default: {} })
  weeklyActivity: Record<
    string,
    {
      puzzlesAttempted: number;
      puzzlesCompleted: number;
      timeSpent: number;
      weekStart: string;
    }
  >;

  @Column('jsonb', { default: {} })
  monthlyActivity: Record<
    string,
    {
      puzzlesAttempted: number;
      puzzlesCompleted: number;
      timeSpent: number;
      month: string;
    }
  >;

  // Learning Path & Recommendations
  @Column('jsonb', { default: [] })
  recommendedPuzzles: string[]; // Puzzle IDs

  @Column('jsonb', { default: [] })
  weakAreas: string[]; // Categories or skills that need improvement

  @Column('jsonb', { default: [] })
  strongAreas: string[]; // Categories or skills user excels at

  // Achievement Progress
  @Column('int', { default: 0 })
  totalAchievements: number;

  @Column('int', { default: 0 })
  totalBadges: number;

  @OneToMany(
    () => UserAchievement,
    (userAchievement) => userAchievement.userProgress,
  )
  achievements: UserAchievement[];

  // Backup and Restore
  @Column('jsonb', { nullable: true })
  backupData: any;

  @Column('timestamp', { nullable: true })
  lastBackupDate: Date;

  @OneToMany(() => ProgressSnapshot, (snapshot) => snapshot.userProgress)
  snapshots: ProgressSnapshot[];

  // Ranking and Leaderboard
  @Column('int', { default: 0 })
  globalRank: number;

  @Column('int', { default: 0 })
  categoryRanks: Record<string, number>;

  @Column('float', { default: 0 })
  competitiveScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed Properties
  get completionRate(): number {
    return this.totalPuzzlesAttempted > 0
      ? (this.totalPuzzlesCompleted / this.totalPuzzlesAttempted) * 100
      : 0;
  }

  get solveRate(): number {
    return this.totalPuzzlesAttempted > 0
      ? (this.totalPuzzlesSolved / this.totalPuzzlesAttempted) * 100
      : 0;
  }

  get averageTimePerPuzzle(): number {
    return this.totalPuzzlesCompleted > 0
      ? this.totalTimeSpent / this.totalPuzzlesCompleted
      : 0;
  }

  get isActiveToday(): boolean {
    if (!this.lastActiveDate) return false;
    const today = new Date();
    const lastActive = new Date(this.lastActiveDate);
    return (
      today.getFullYear() === lastActive.getFullYear() &&
      today.getMonth() === lastActive.getMonth() &&
      today.getDate() === lastActive.getDate()
    );
  }
}
