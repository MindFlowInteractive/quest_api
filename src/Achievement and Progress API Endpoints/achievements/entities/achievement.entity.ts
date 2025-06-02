
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserAchievement } from './user-achievement.entity';

export enum AchievementType {
  PROGRESS = 'progress',
  MILESTONE = 'milestone',
  COMPLETION = 'completion',
  STREAK = 'streak',
  COLLECTION = 'collection'
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  hint: string;

  @Column({ type: 'enum', enum: AchievementType })
  type: AchievementType;

  @Column({ type: 'enum', enum: AchievementRarity, default: AchievementRarity.COMMON })
  rarity: AchievementRarity;

  @Column()
  icon: string;

  @Column('json')
  criteria: Record<string, any>;

  @Column({ default: 0 })
  points: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isHidden: boolean;

  @Column({ default: false })
  isRetroactive: boolean;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => UserAchievement, userAchievement => userAchievement.achievement)
  userAchievements: UserAchievement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}