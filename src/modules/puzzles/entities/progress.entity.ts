import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from 'typeorm';
import { Puzzle } from './puzzle.entity';
import { User } from '../../user/entities/user.entity';

@Entity('puzzle_progress')
export class PuzzleProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Puzzle)
  puzzle: Puzzle;

  @ManyToOne(() => User)
  user: User;

  @Column('boolean', { default: false })
  completed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
