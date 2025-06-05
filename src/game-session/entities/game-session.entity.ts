import { User } from '@/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  PAUSED = 'paused',
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
}

@Entity('game_sessions')
@Index(['userId'])
@Index(['status'])
@Index(['startedAt'])
@Index(['deviceType'])
export class GameSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  duration: number; // in seconds

  @Column({ type: 'int', default: 0 })
  puzzlesAttempted: number;

  @Column({ type: 'int', default: 0 })
  puzzlesCompleted: number;

  @Column({ type: 'int', default: 0 })
  totalScore: number;

  @Column({ type: 'int', default: 0 })
  experienceGained: number;

  @Column({ type: 'enum', enum: DeviceType, nullable: true })
  deviceType: DeviceType;

  @Column({ length: 200, nullable: true })
  userAgent: string;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'json', nullable: true })
  sessionData: any; // Additional session metadata

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.gameSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
