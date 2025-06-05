import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserAchievement } from './user-achievement.entity';

export enum AchievementType {
  PUZZLE_COMPLETION = 'puzzle_completion',
  SCORE_MILESTONE = 'score_milestone',
  TIME_BASED = 'time_based',
  STREAK = 'streak',
  DIFFICULTY = 'difficulty',
  CATEGORY = 'category',
  SPECIAL = 'special',
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('achievements')
@Index(['type'])
@Index(['rarity'])
@Index(['isActive'])
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: AchievementType })
  type: AchievementType;

  @Column({
    type: 'enum',
    enum: AchievementRarity,
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity;

  @Column({ type: 'text', nullable: true })
  iconUrl: string;

  @Column({ type: 'int', default: 0 })
  points: number; // Achievement points awarded

  @Column({ type: 'json' })
  unlockConditions: any; // Flexible conditions for unlocking

  @Column({ type: 'boolean', default: false })
  isSecret: boolean; // Hidden until unlocked

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  unlockedCount: number; // How many users have this achievement

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(
    () => UserAchievement,
    (userAchievement) => userAchievement.achievement,
  )
  userAchievements: UserAchievement[];
}
