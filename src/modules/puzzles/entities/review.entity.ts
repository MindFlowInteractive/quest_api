import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Puzzle } from './puzzle.entity';
import { User } from '../../user/entities/user.entity';

@Entity('puzzle_reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Puzzle, puzzle => puzzle.reviews)
  puzzle: Puzzle;

  @ManyToOne(() => User)
  user: User;

  @Column('int')
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
