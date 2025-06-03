import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class LeaderboardEntryArchive {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  leaderboardId: number;

  @Column()
  userId: number;

  @Column()
  score: number;

  @Column()
  time: number;

  @Column()
  efficiency: number;

  @Column({ type: 'timestamp' })
  achievedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  archivedAt: Date;
}