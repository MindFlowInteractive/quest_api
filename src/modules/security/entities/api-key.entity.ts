import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id: string;

  @Column()
  @ApiProperty()
  name: string;

  @Column()
  @ApiProperty()
  key: string;

  @Column({ default: true })
  @ApiProperty()
  isActive: boolean;

  @Column('simple-array')
  @ApiProperty()
  allowedIps: string[];

  @Column('simple-array')
  @ApiProperty()
  allowedEndpoints: string[];

  @Column({ type: 'int', default: 1000 })
  @ApiProperty()
  rateLimit: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt: Date;

  @Column({ nullable: true })
  @ApiProperty()
  expiresAt: Date;
}
