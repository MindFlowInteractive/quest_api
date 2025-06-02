import {
  NotificationCategory,
  NotificationType,
} from '@/common/enums/notification.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_analytics')
@Index(['date', 'category'])
export class NotificationAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: NotificationCategory })
  category: NotificationCategory;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  campaignId: string;

  @Column({ type: 'int', default: 0 })
  sent: number;

  @Column({ type: 'int', default: 0 })
  delivered: number;

  @Column({ type: 'int', default: 0 })
  opened: number;

  @Column({ type: 'int', default: 0 })
  clicked: number;

  @Column({ type: 'int', default: 0 })
  failed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  deliveryRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  openRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  clickRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
