import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('security_audits')
export class SecurityAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId?: string;

  @Column()
  event: string; // e.g. "rate_limit_trigger", "failed_login", "api_key_revoked"

  @Column({ type: 'jsonb', nullable: true })
  meta?: any;

  @Column()
  ip: string;

  @Column()
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
