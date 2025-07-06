import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('hint_usage')
export class HintUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  puzzleId: string;

  @Column()
  puzzleType: string;

  @Column()
  level: number;

  @Column({ default: false })
  helpful: boolean;

  @CreateDateColumn()
  usedAt: Date;
}
