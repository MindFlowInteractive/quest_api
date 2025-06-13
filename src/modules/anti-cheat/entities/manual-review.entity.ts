import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { CheatDetection } from './cheat-detection.entity';

@Entity('manual_reviews')
export class ManualReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CheatDetection)
  cheatDetection: CheatDetection;

  @Column()
  cheatDetectionId: string;

  @ManyToOne(() => User)
  reviewer: User;

  @Column()
  reviewerId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: ['confirmed_cheat', 'false_positive', 'needs_more_data', 'inconclusive'],
    nullable: true,
  })
  decision: string;

  @Column({ type: 'text', nullable: true })
  reasoning: string;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
