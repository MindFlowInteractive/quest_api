import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('community_reports')
export class CommunityReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  reporter: User;

  @Column()
  reporterId: string;

  @ManyToOne(() => User)
  reportedUser: User;

  @Column()
  reportedUserId: string;

  @Column({
    type: 'enum',
    enum: ['cheating', 'unfair_play', 'suspicious_behavior', 'other'],
  })
  reportType: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json', nullable: true })
  evidence: any;

  @Column({
    type: 'enum',
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true })
  moderatorId: string;

  @Column({ type: 'text', nullable: true })
  moderatorNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
