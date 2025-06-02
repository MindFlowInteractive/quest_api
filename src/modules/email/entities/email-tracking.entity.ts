import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EmailTrackingStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}

@Entity('email_tracking')
export class EmailTracking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  messageId!: string;

  @Column()
  recipient!: string;

  @Column({
    type: 'enum',
    enum: EmailTrackingStatus,
    default: EmailTrackingStatus.PENDING,
  })
  status!: EmailTrackingStatus;

  @Column({ nullable: true })
  error?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column('jsonb', { nullable: true, default: () => "'[]'" })
  events?: Array<{ type: string; timestamp: Date; data: any }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
