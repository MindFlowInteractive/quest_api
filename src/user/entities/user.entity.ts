import { UserAchievement } from '@/achievement/entities/user-achievement.entity';
import { GameSession } from '@/game-session/entities/game-session.entity';
import { PuzzleProgress } from '@/puzzle/entities/puzzle-progress.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export enum UserRole {
  PLAYER = 'player',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export enum DifficultyPreference {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ length: 100, nullable: true })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  avatar: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PLAYER })
  role: UserRole;

  @Column({ type: 'int', default: 0 })
  totalScore: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  experience: number;

  // User Preferences
  @Column({
    type: 'enum',
    enum: DifficultyPreference,
    default: DifficultyPreference.EASY,
  })
  preferredDifficulty: DifficultyPreference;

  @Column({ type: 'boolean', default: true })
  soundEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  notificationsEnabled: boolean;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => PuzzleProgress, (progress) => progress.user)
  puzzleProgress: PuzzleProgress[];

  @OneToMany(() => GameSession, (session) => session.user)
  gameSessions: GameSession[];

  @OneToMany(() => UserAchievement, (userAchievement) => userAchievement.user)
  achievements: UserAchievement[];
}
