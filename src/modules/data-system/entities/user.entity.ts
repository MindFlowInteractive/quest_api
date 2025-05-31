import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Puzzle } from './puzzle.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ select: false })
  password!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ type: 'json', nullable: true })
  preferences?: Record<string, any>;

  @OneToMany(() => Puzzle, (puzzle) => puzzle.user)
  puzzles!: Puzzle[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
