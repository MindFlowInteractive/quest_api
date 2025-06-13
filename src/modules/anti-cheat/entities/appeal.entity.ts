import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { CheatDetection } from './cheat-detection.entity';

@Entity('appeals')
export class Appeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  appellant: User;

  @Column()
  appellantId: string;

  @ManyToOne(() => CheatDetection)
  cheatDetection: CheatDetection;

  @Column()
  cheatDetectionId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'json', nullable: true })
  evidence: any;

  @Column({
    type: 'enum',
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true })
  reviewerId: string;

  @Column({ type: 'text', nullable: true })
  reviewerNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({
    type: 'enum',
    enum: ['false_positive_confirmed', 'cheat_confirmed', 'insufficient_evidence'],
    nullable: true,
  })
  outcome: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
