import { NotificationCategory } from '@/common/enums/notification.enum';
import { User } from '@/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // In-app notification preferences
  @Column({ type: 'boolean', default: true })
  inAppEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  inAppCategories: Record<NotificationCategory, boolean>;

  // Push notification preferences
  @Column({ type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  pushCategories: Record<NotificationCategory, boolean>;

  // Email notification preferences
  @Column({ type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  emailCategories: Record<NotificationCategory, boolean>;

  // SMS notification preferences
  @Column({ type: 'boolean', default: false })
  smsEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  smsCategories: Record<NotificationCategory, boolean>;

  // Quiet hours
  @Column({ type: 'time', nullable: true })
  quietHoursStart: string;

  @Column({ type: 'time', nullable: true })
  quietHoursEnd: string;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  // Frequency limits
  @Column({ type: 'int', default: 10 })
  maxDailyNotifications: number;

  @Column({ type: 'int', default: 3 })
  maxHourlyNotifications: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
