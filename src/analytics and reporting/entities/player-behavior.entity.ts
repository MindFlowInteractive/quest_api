import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('player_behavior')
@Index(['playerId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class PlayerBehaviorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  sessionId: string;

  @Column()
  eventType: string;

  @Column('json', { nullable: true })
  eventData: any;

  @Column()
  deviceType: string;

  @Column()
  platform: string;

  @Column({ nullable: true })
  location: string;

  @Column('int', { default: 0 })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;
}
