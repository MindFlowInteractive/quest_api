import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { GenerationMetrics } from './generation-metrics.entity';

@Entity()
export class PuzzleComponent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column('jsonb')
  config: any;

  @Column()
  position: string;

  @ManyToOne(() => GenerationMetrics, generationMetrics => generationMetrics.components)
  puzzle: GenerationMetrics;
}