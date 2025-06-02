import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Puzzle } from './puzzle.entity';
import { User } from '../../user/entities/user.entity';

@Entity('puzzle_feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Puzzle, puzzle => puzzle.feedback)
  puzzle: Puzzle;

  @ManyToOne(() => User)
  user: User;

  @Column('text', { nullable: true })
  comment: string;

  @Column('int', { nullable: true })
  difficulty: number;

  @Column('int', { nullable: true })
  quality: number;

  @CreateDateColumn()
  createdAt: Date;
}
