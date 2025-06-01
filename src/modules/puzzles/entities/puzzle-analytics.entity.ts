import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Puzzle } from './puzzle.entity';
import { User } from '../../user/entities/user.entity';

@Entity('puzzle_analytics')
export class PuzzleAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Puzzle, (puzzle) => puzzle.analytics)
  puzzle: Puzzle;

  @ManyToOne(() => User)
  user: User;

  @Column('int')
  completionTime: number;

  @Column('boolean')
  isSuccessful: boolean;

  @Column('int', { nullable: true })
  attempts: number;

  @Column('jsonb', { nullable: true })
  userFeedback: {
    rating: number;
    comments: string;
    difficulty: string;
  };

  @Column('jsonb', { nullable: true })
  performance: {
    hintsUsed: number;
    mistakes: number;
    timeSpentOnHints: number;
    sectionsCompleted: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;
}
