import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Puzzle } from './puzzle.entity';
import { User } from '../../user/entities/user.entity';

@Entity('puzzle_versions')
export class PuzzleVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('int')
  versionNumber: number;

  @Column('text')
  content: string;

  @Column('jsonb')
  metadata: {
    changes: string[];
    reason: string;
    previousVersion: string;
  };

  @ManyToOne(() => Puzzle, (puzzle) => puzzle.versions)
  puzzle: Puzzle;

  @ManyToOne(() => User)
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column('boolean', { default: false })
  isPublished: boolean;

  @Column('timestamp', { nullable: true })
  publishedAt: Date;
}
