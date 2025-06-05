import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PuzzleProgress } from './puzzle-progress.entity';

export enum PuzzleType {
  LOGIC = 'logic',
  MATH = 'math',
  WORD = 'word',
  VISUAL = 'visual',
  MEMORY = 'memory',
}

export enum DifficultyLevel {
  BEGINNER = 1,
  EASY = 2,
  MEDIUM = 3,
  HARD = 4,
  EXPERT = 5,
}

@Entity('puzzles')
@Index(['type'])
@Index(['difficultyLevel'])
@Index(['isActive'])
@Index(['category'])
export class Puzzle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: PuzzleType })
  type: PuzzleType;

  @Column({ length: 100 })
  category: string;

  @Column({ type: 'enum', enum: DifficultyLevel })
  difficultyLevel: DifficultyLevel;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  difficultyRating: number; // User-generated rating 0-5

  @Column({ type: 'json' })
  puzzleData: any; // Flexible JSON field for puzzle-specific data

  @Column({ type: 'json' })
  solution: any; // Solution data

  @Column({ type: 'json', nullable: true })
  hints: any[]; // Array of hints

  @Column({ type: 'int', default: 100 })
  maxScore: number;

  @Column({ type: 'int', default: 300 }) // seconds
  timeLimit: number;

  @Column({ type: 'int', default: 0 })
  playCount: number;

  @Column({ type: 'int', default: 0 })
  completionCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageCompletionTime: number; // in seconds

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  successRate: number; // percentage

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ length: 100 })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => PuzzleProgress, (progress) => progress.puzzle)
  userProgress: PuzzleProgress[];
}
