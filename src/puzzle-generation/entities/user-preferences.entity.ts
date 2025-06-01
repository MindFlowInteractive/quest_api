import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UserPreferences {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column('json')
  preferredDifficulties: number[];

  @Column('json')
  preferredTypes: string[];

  @Column('json')
  avoidPatterns: any[];

  @Column('decimal', { precision: 3, scale: 2 })
  skillLevel: number;

  @Column('json')
  playHistory: any[];
}