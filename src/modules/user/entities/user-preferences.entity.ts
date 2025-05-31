import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum Language {
  EN = 'en',
  ES = 'es',
  FR = 'fr',
  DE = 'de',
}

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: Theme,
    default: Theme.LIGHT,
  })
  theme: Theme;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.EN,
  })
  language: Language;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  @Column({ default: false })
  smsNotifications: boolean;

  @Column({ default: true })
  marketingEmails: boolean;

  @Column({ default: true })
  profileVisibility: boolean;

  @Column({ default: false })
  showOnlineStatus: boolean;

  @Column({ default: true })
  allowFriendRequests: boolean;

  @Column({ type: 'json', nullable: true })
  privacySettings: Record<string, any>;

  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn({ name: 'userId' })
  user: User;
}
