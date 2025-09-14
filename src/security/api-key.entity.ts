import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // hashed key fingerprint (don't store raw API key)
  @Index({ unique: true })
  @Column()
  keyHash: string;

  @Column()
  owner: string; // e.g. service name or user id

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
