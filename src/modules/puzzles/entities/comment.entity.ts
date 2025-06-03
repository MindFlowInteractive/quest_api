import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Puzzle } from './puzzle.entity';
import { User } from '../../user/entities/user.entity';

@Entity('puzzle_comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Puzzle, puzzle => puzzle.comments)
  puzzle: Puzzle;

  @ManyToOne(() => User)
  user: User;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
