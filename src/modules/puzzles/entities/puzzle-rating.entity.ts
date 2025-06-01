import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Puzzle } from './puzzle.entity';
import { User } from '../../user/entities/user.entity';

@Entity('puzzle_ratings')
export class PuzzleRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Puzzle, (puzzle) => puzzle.ratings)
  puzzle: Puzzle;

  @ManyToOne(() => User)
  user: User;

  @Column('float')
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @Column('jsonb')
  ratings: {
    difficulty: number;
    quality: number;
    creativity: number;
    educational: number;
    enjoyment: number;
  };

  @Column('boolean', { default: false })
  isVerified: boolean;

  @Column('boolean', { default: false })
  isModerated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column('timestamp', { nullable: true })
  moderatedAt: Date;

  @Column('uuid', { nullable: true })
  moderatedBy: string;
}
