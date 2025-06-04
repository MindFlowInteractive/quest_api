import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { GenerationMetrics } from './generation-metrics.entity';

@Entity()
export class VersionHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => GenerationMetrics, generationMetrics => generationMetrics.versionHistory)
  puzzle: GenerationMetrics;

  @Column('jsonb')
  snapshot: any;

  @Column()
  changedBy: string;

  @CreateDateColumn()
  changedAt: Date;
}