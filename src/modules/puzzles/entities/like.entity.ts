import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Puzzle } from './puzzle.entity';
import { User } from '../../user/entities/user.entity';

@Entity('puzzle_likes')
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Puzzle, puzzle => puzzle.likes)
  puzzle: Puzzle;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
