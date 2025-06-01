import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ABTestConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  testName: string;

  @Column('json')
  variantA: any;

  @Column('json')
  variantB: any;

  @Column()
  isActive: boolean;

  @Column('decimal', { precision: 3, scale: 2 })
  trafficSplit: number;
}