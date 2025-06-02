import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('puzzle_performance')
@Index(['puzzleId', 'createdAt'])
@Index(['difficulty', 'createdAt'])
export class PuzzlePerformanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  puzzleId: string;

  @Column()
  difficulty: string;

  @Column('int')
  completionTime: number;

  @Column('int')
  attempts: number;

  @Column('boolean')
  completed: boolean;

  @Column('int', { default: 0 })
  hintsUsed: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  score: number;

  @CreateDateColumn()
  createdAt: Date;
}
