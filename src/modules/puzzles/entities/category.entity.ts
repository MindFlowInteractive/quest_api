import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Puzzle } from './puzzle.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  icon: string;

  @Column('int', { default: 0 })
  puzzleCount: number;

  @Column('boolean', { default: true })
  isActive: boolean;

  @ManyToMany(() => Puzzle, (puzzle) => puzzle.categories)
  puzzles: Puzzle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
