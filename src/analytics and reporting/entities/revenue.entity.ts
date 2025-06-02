import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('revenue')
@Index(['playerId', 'createdAt'])
@Index(['productType', 'createdAt'])
export class RevenueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  transactionId: string;

  @Column()
  productType: string;

  @Column()
  productId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  paymentMethod: string;

  @Column({ default: 'completed' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
