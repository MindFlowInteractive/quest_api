import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AchievementType {
  BADGE = 'badge',
  MILESTONE = 'milestone',
  REWARD = 'reward',
}

@Entity('user_achievements')
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AchievementType,
    default: AchievementType.BADGE,
  })
  type: AchievementType;

  @Column({ nullable: true })
  iconUrl: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ default: false })
  isVisible: boolean;

  @CreateDateColumn()
  earnedAt: Date;

  @ManyToOne(() => User, (user) => user.achievements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
