import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { LeaderboardEntry } from './lederboard-entry.entity';

@Entity()
export class Leaderboard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column()
  period: string;

  @Column({ default: true })
  isPublic: boolean;

  @OneToMany(
    () => LeaderboardEntry,
    (entry: LeaderboardEntry) => entry.leaderboard,
  )
  entries: LeaderboardEntry[];
}
