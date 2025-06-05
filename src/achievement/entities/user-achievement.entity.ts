import { User } from '@/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Achievement } from './achievement.entity';

@Entity('user_achievements')
@Index(['userId', 'achievementId'], { unique: true })
@Index(['userId', 'unlockedAt'])
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  achievementId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number; // Progress towards achievement (0-100)

  @Column({ type: 'boolean', default: false })
  isUnlocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  unlockedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: any; // Additional data about how achievement was earned

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.achievements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Achievement, (achievement) => achievement.userAchievements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'achievementId' })
  achievement: Achievement;
}
