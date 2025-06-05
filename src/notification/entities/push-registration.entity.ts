/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class PushRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.pushRegistrations)
  user: User;

  @Column()
  deviceToken: string;

  @Column()
  platform: string; // 'ios', 'android', 'web'
}
