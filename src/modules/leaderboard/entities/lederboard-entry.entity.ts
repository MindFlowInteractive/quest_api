import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Leaderboard } from './leaderboard.entity';

@Entity()
export class LeaderboardEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  score: number;

  @Column()
  time: number;

  @Column()
  efficiency: number;

  @ManyToOne(() => Leaderboard, (leaderboard) => leaderboard.entries)
  leaderboard: Leaderboard;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  achievedAt: Date;
}
