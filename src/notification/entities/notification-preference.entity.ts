/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.preferences)
  user: User;

  @Column()
  channel: string; // e.g., 'email', 'push', 'sms'

  @Column({ default: true })
  enabled: boolean;
}
