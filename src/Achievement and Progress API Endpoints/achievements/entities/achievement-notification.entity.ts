import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum NotificationType {
  UNLOCK = 'unlock',
  PROGRESS = 'progress',
  MILESTONE = 'milestone',
  SHARE = 'share'
}

@Entity('achievement_notifications')
export class AchievementNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  achievementId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column('text')
  message: string;

  @Column('json', { nullable: true })
  data: Record<string, any>;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
