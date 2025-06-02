import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { FileEntity } from './file.entity';

export enum AnalyticsEvent {
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  VIEW = 'view',
  SHARE = 'share',
  DELETE = 'delete',
  PROCESS = 'process',
}

@Entity('file_analytics')
@Index(['fileId', 'event', 'createdAt'])
export class FileAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: AnalyticsEvent })
  event!: AnalyticsEvent;

  @Column({ nullable: true })
  userAgent!: string;

  @Column({ nullable: true })
  ipAddress!: string;

  @Column({ nullable: true })
  referrer!: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => FileEntity, (file) => file.analytics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fileId' })
  file!: FileEntity;

  @Column('uuid')
  fileId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
