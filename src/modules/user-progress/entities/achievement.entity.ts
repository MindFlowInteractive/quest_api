// src/user-progress/entities/achievement.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserAchievement } from './user-achievement.entity';

export enum AchievementType {
  COMPLETION = 'completion',
  STREAK = 'streak',
  SKILL = 'skill',
  SPEED = 'speed',
  SOCIAL = 'social',
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
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: AchievementType,
  })
  type: AchievementType;

  @Column({
    type: 'enum',
    enum: AchievementRarity,
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity;

  @Column('int', { default: 0 })
  points: number;

  @Column({ nullable: true })
  iconUrl: string;

  @Column({ nullable: true })
  badgeUrl: string;

  @Column('jsonb')
  criteria: {
    type: string;
    value: number;
    comparison: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
    field: string;
    category?: string;
    difficulty?: string;
    timeframe?: string;
  };

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('int', { default: 0 })
  totalUnlocked: number;

  @OneToMany(
    () => UserAchievement,
    (userAchievement) => userAchievement.achievement,
  )
  userAchievements: UserAchievement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
