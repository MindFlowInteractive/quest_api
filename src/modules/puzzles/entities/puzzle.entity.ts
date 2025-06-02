import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Category } from './category.entity';
import { Tag } from './tag.entity';
import { PuzzleVersion } from './puzzle-version.entity';
import { PuzzleAnalytics } from './puzzle-analytics.entity';
import { PuzzleRating } from './puzzle-rating.entity';
import { Review } from './review.entity';
import { Like } from './like.entity';
import { Comment } from './comment.entity';
import { Feedback } from './feedback.entity';
import { PuzzleProgress } from './progress.entity';

export enum PuzzleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  MODERATION = 'moderation',
}

export enum PuzzleDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

@Entity('puzzles')
export class Puzzle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: PuzzleStatus,
    default: PuzzleStatus.DRAFT,
  })
  status: PuzzleStatus;

  @Column({
    type: 'enum',
    enum: PuzzleDifficulty,
    default: PuzzleDifficulty.MEDIUM,
  })
  difficulty: PuzzleDifficulty;

  @Column('float', { default: 0 })
  averageRating: number;

  @Column('int', { default: 0 })
  totalAttempts: number;

  @Column('int', { default: 0 })
  successfulAttempts: number;

  @Column('int', { default: 0 })
  averageCompletionTime: number;

  @Column('jsonb', { nullable: true })
  metadata: {
    estimatedTime: number;
    requiredSkills: string[];
    learningObjectives: string[];
    prerequisites: string[];
    hints: string[];
    solution: string;
    customFields: Record<string, any>;
  };

  @ManyToOne(() => User)
  creator: User;

  @ManyToMany(() => Category)
  @JoinTable()
  categories: Category[];

  @ManyToMany(() => Tag)
  @JoinTable()
  tags: Tag[];

  @OneToMany(() => PuzzleVersion, (version: PuzzleVersion) => version.puzzle)
  versions: PuzzleVersion[];

  @OneToMany(() => PuzzleAnalytics, (analytics: PuzzleAnalytics) => analytics.puzzle)
  analytics: PuzzleAnalytics[];

  @OneToMany(() => PuzzleRating, (rating: PuzzleRating) => rating.puzzle)
  ratings: PuzzleRating[];

  @OneToMany(() => Review, (review: Review) => review.puzzle)
  reviews: Review[];

  @OneToMany(() => Like, (like: Like) => like.puzzle)
  likes: Like[];

  @OneToMany(() => Comment, (comment: Comment) => comment.puzzle)
  comments: Comment[];

  @OneToMany(() => Feedback, (feedback: Feedback) => feedback.puzzle)
  feedback: Feedback[];

  @OneToMany(() => PuzzleProgress, (progress: PuzzleProgress) => progress.puzzle)
  progress: PuzzleProgress[];

  @Column('boolean', { default: false })
  isPublic: boolean;

  @Column('boolean', { default: false })
  isModerated: boolean;

  @Column('timestamp', { nullable: true })
  lastModeratedAt: Date;

  @Column('uuid', { nullable: true })
  moderatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  publishedAt: Date;

  @Column('int', { default: 0 })
  viewCount: number;

  @Column('int', { default: 0 })
  shareCount: number;

  @Column('jsonb', { nullable: true })
  exportMetadata: {
    lastExportedAt: Date;
    exportFormat: string;
    exportVersion: string;
  };
}
