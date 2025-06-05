/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Notification } from './notification.entity';
import { User } from './user.entity';

@Entity()
export class NotificationEngagement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Notification)
  notification: Notification;

  @ManyToOne(() => User)
  user: User;

  @Column()
  action: string; // e.g., 'clicked', 'read', 'dismissed'

  @CreateDateColumn()
  timestamp: Date;
}
