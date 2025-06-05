/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { PushRegistration } from './push-registration.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => NotificationPreference, (pref) => pref.user)
  preferences: NotificationPreference[];

  @OneToMany(() => PushRegistration, (push) => push.user)
  pushRegistrations: PushRegistration[];
}
