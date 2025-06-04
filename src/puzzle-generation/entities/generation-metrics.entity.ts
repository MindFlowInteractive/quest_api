import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { VersionHistory } from './version-history.entity';
import { PuzzleComponent } from './puzzle-component.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity()
export class GenerationMetrics {
  @PrimaryGeneratedColumn()
  id: number;

   @Column()
  title: string;

  @Column()
  puzzleType: string;

  @Column()
  difficulty: number;

  @Column('decimal', { precision: 5, scale: 3 })
  generationTime: number;

  @Column('decimal', { precision: 3, scale: 2 })
  qualityScore: number;

  @Column('decimal', { precision: 3, scale: 2 })
  playerEngagement: number;

  @Column('decimal', { precision: 3, scale: 2 })
  completionRate: number;

  @Column()
  uniquenessScore: number;

  @Column('json')
  parameters: any;

  @Column('jsonb')
  layout: any;

  @Column()
  createdBy: string;

  @OneToMany(() => VersionHistory, vh => vh.puzzle)
  versionHistory: VersionHistory[];

  @OneToMany(() => PuzzleComponent, pc => pc.puzzle)
  components: PuzzleComponent[];

  @ManyToMany(() => User)
  @JoinTable()
  contributors: User[];

  @Column({ default: false })
  isTemplate: boolean;

  @Column({ default: false })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
