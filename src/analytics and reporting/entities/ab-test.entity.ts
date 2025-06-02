import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ab_test')
@Index(['testName', 'variant'])
export class ABTestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  testName: string;

  @Column()
  variant: string;

  @Column()
  eventType: string;

  @Column('json', { nullable: true })
  eventData: any;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  conversionValue: number;

  @CreateDateColumn()
  createdAt: Date;
}
