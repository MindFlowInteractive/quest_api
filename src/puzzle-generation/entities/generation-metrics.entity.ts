import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class GenerationMetrics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  puzzleType: string;

  @Column()
  difficulty: number;

  @Column('decimal', { precision: 5, scale: 3 })
  generationTime: number;

  @Column('decimal', { precision: 3, scale: 2 })
  qualityScore: number;

  @Column('decimal', { precision: 3, scale: 2 })
  playerEngagement: number;

  @Column('decimal', { precision: 3, scale: 2 })
  completionRate: number;

  @Column()
  uniquenessScore: number;

  @Column('json')
  parameters: any;

  @CreateDateColumn()
  createdAt: Date;
}
