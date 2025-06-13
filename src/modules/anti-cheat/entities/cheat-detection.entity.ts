import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Puzzle } from '../../puzzles/entities/puzzle.entity';

@Entity('cheat_detections')
export class CheatDetection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Puzzle)
  puzzle: Puzzle;

  @Column()
  puzzleId: string;

  @Column()
  puzzleType: string;

  @Column({
    type: 'enum',
    enum: ['timing_anomaly', 'solution_impossible', 'sequence_invalid', 'pattern_suspicious', 'statistical_outlier'],
  })
  detectionType: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  confidence: number;

  @Column({ type: 'json', nullable: true })
  details: any;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'false_positive', 'dismissed'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
