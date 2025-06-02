import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_preferences')
export class EmailPreferences {
  @PrimaryColumn()
  email!: string;

  @Column('jsonb', {
    default: {
      marketing: true,
      transactional: true,
      newsletters: true,
      announcements: true,
      unsubscribed: false,
    },
  })
  preferences!: {
    marketing: boolean;
    transactional: boolean;
    newsletters: boolean;
    announcements: boolean;
    unsubscribed: boolean;
  };

  @Column({ unique: true })
  unsubscribeToken!: string;

  @Column('jsonb', { nullable: true, default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
