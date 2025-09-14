import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('save_games')
export class SaveGame {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Reference to your users table (string/uuid)
  @Index()
  @Column()
  userId: string;

  // E.g. 'slot1', 'autosave', 'cloud-slot-1'
  @Index()
  @Column()
  slot: string;

  // Actual compressed save blob (bytes encoded base64) or compressed JSON string
  // We'll store compressed data as text (base64 encoded) to keep things simple
  @Column({ type: 'text' })
  compressedData: string;

  // The raw schema version of the saved game (migration target)
  @Column({ default: 1 })
  version: number;

  // Platform metadata: 'PC', 'ANDROID', 'IOS', 'XBOX'...
  @Column({ default: 'PC' })
  platform: string;

  // Whether this is intended as a cloud-synced save
  @Column({ default: true })
  isCloud: boolean;

  // If this is a backup copy
  @Column({ default: false })
  isBackup: boolean;

  // Optional human note (e.g. "Autosave before boss")
  @Column({ type: 'varchar', nullable: true })
  note?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
