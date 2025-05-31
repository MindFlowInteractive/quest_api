import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { UserStatus, UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  bio: string;

  @Expose()
  avatarUrl: string;

  @Expose()
  dateOfBirth: Date;

  @Expose()
  phoneNumber: string;

  @Expose()
  location: string;

  @Expose()
  website: string;

  @Expose()
  status: UserStatus;

  @Expose()
  role: UserRole;

  @Expose()
  isEmailVerified: boolean;

  @Expose()
  isPhoneVerified: boolean;

  @Expose()
  lastLoginAt: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Transform(({ obj }) => `${obj.firstName} ${obj.lastName}`)
  fullName: string;

  @Expose()
  @Transform(({ obj }) => obj.status === UserStatus.ACTIVE)
  isActive: boolean;

  @Exclude()
  password: string;

  @Exclude()
  deactivatedAt: Date;
}

export class UserStatsDto {
  @Expose()
  totalUsers: number;

  @Expose()
  activeUsers: number;

  @Expose()
  newUsersThisMonth: number;

  @Expose()
  verifiedUsers: number;

  @Expose()
  usersByRole: Record<UserRole, number>;

  @Expose()
  usersByStatus: Record<UserStatus, number>;
}
