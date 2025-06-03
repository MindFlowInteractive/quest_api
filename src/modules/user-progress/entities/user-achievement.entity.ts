import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Achievement } from './achievement.entity';
import { UserProgress } from './user-progress.entity';

@Entity('user_achievements')
@Index(['userId', 'achievementId'], { unique: true })
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  achievementId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Achievement, { onDelete: 'CASCADE' })
  achievement: Achievement;

  @ManyToOne(() => UserProgress, (progress) => progress.achievements, {
    onDelete: 'CASCADE',
  })
  userProgress: UserProgress;

  @Column('float', { default: 0 })
  progress: number; // 0-100 percentage

  @Column('boolean', { default: false })
  isUnlocked: boolean;

  @Column('timestamp', { nullable: true })
  unlockedAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: {
    triggerValue?: number;
    snapshot?: any;
    context?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
