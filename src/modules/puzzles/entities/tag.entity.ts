import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Puzzle } from './puzzle.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  color: string;

  @Column('int', { default: 0 })
  usageCount: number;

  @Column('boolean', { default: true })
  isActive: boolean;

  @ManyToMany(() => Puzzle, (puzzle) => puzzle.tags)
  puzzles: Puzzle[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
