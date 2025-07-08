import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('difficulty_profile')
export class DifficultyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column('float')
  skillScore: number;

  @Column()
  currentDifficultyLevel: string;

  @Column('jsonb', { nullable: true })
  performanceMetrics: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
