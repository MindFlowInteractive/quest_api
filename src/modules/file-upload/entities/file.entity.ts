import { User } from '@/modules/data-system/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { FileMetadata } from './file-metadata.entity';
import { FileAnalytics } from './file-analytics.entity';
import { FileShare } from './file-share.entity';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
  DELETED = 'deleted',
}

export enum StorageTier {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
  ARCHIVE = 'archive',
}

@Entity('files')
@Index(['userId', 'status'])
@Index(['fileType', 'status'])
@Index(['createdAt'])
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  originalName!: string;

  @Column()
  fileName!: string;

  @Column()
  mimeType!: string;

  @Column({ type: 'enum', enum: FileType })
  fileType!: FileType;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ nullable: true })
  checksum!: string;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.UPLOADING })
  status!: FileStatus;

  @Column({ type: 'enum', enum: StorageTier, default: StorageTier.HOT })
  storageTier!: StorageTier;

  @Column()
  storageKey!: string;

  @Column({ nullable: true })
  publicUrl!: string;

  @Column({ nullable: true })
  thumbnailUrl!: string;

  @Column({ type: 'json', nullable: true })
  variants?: Record<string, string>; // Different sizes/formats

  @Column({ type: 'json', nullable: true })
  processingMetadata?: Record<string, any>;

  @Column({ default: false })
  isPublic!: boolean;

  @Column({ nullable: true })
  expiresAt!: Date;

  @Column({ default: 0 })
  downloadCount!: number;

  @Column({ default: 0 })
  viewCount!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('uuid')
  userId!: string;

  @OneToMany(() => FileMetadata, (metadata) => metadata.file, { cascade: true })
  metadata!: FileMetadata[];

  @OneToMany(() => FileAnalytics, (analytics) => analytics.file, {
    cascade: true,
  })
  analytics!: FileAnalytics[];

  @OneToMany(() => FileShare, (share) => share.file, { cascade: true })
  shares!: FileShare[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
