import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('request_logs')
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id: string;

  @Column()
  @Index()
  @ApiProperty()
  endpoint: string;

  @Column()
  @Index()
  @ApiProperty()
  method: string;

  @Column({ nullable: true })
  @Index()
  @ApiProperty()
  userId: string;

  @Column({ nullable: true })
  @Index()
  @ApiProperty()
  apiKeyId: string;

  @Column()
  @Index()
  @ApiProperty()
  ip: string;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty()
  headers: Record<string, string>;

  @Column({ type: 'int' })
  @ApiProperty()
  responseTime: number;

  @Column({ type: 'int' })
  @ApiProperty()
  statusCode: number;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  errorMessage: string;

  @CreateDateColumn()
  @Index()
  @ApiProperty()
  createdAt: Date;
}
