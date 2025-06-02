import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('engagement')
@Index(['playerId', 'date'])
export class EngagementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column('date')
  date: Date;

  @Column('int', { default: 0 })
  sessionDuration: number;

  @Column('int', { default: 0 })
  puzzlesSolved: number;

  @Column('int', { default: 0 })
  levelsCompleted: number;

  @Column('boolean', { default: false })
  dailyGoalMet: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
