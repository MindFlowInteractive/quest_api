import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Achievement } from './achievement.entity';

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

@Entity('user_achievements')
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  achievementId: string;

  @ManyToOne(() => Achievement, achievement => achievement.userAchievements)
  @JoinColumn({ name: 'achievementId' })
  achievement: Achievement;

  @Column({ type: 'enum', enum: ProgressStatus, default: ProgressStatus.NOT_STARTED })
  status: ProgressStatus;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  progress: number;

  @Column('json', { nullable: true })
  progressData: Record<string, any>;

  @Column({ nullable: true })
  unlockedAt: Date;

  @Column({ nullable: true })
  sharedAt: Date;

  @Column('json', { nullable: true })
  customization: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
