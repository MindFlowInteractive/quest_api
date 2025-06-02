import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('event_tracking')
@Index(['eventName', 'createdAt'])
@Index(['funnelStep', 'createdAt'])
export class EventTrackingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  sessionId: string;

  @Column()
  eventName: string;

  @Column({ nullable: true })
  funnelStep: string;

  @Column('json', { nullable: true })
  properties: any;

  @Column({ nullable: true })
  referrer: string;

  @Column({ nullable: true })
  utm: string;

  @CreateDateColumn()
  createdAt: Date;
}
