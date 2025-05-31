import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserRole } from './entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { UserActivity, ActivityType } from './entities/user-activity.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { UserResponseDto, UserStatsDto } from './dto/user-response.dto';
import { AuthRequest } from '@/types/AuthRequest';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPreferences)
    private preferencesRepository: Repository<UserPreferences>,
    @InjectRepository(UserAchievement)
    private achievementRepository: Repository<UserAchievement>,
    @InjectRepository(UserActivity)
    private activityRepository: Repository<UserActivity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or username already exists',
      );
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      dateOfBirth: createUserDto.dateOfBirth
        ? new Date(createUserDto.dateOfBirth)
        : undefined,
    });

    const savedUser = await this.userRepository.save(user);

    const preferences = this.preferencesRepository.create({
      userId: savedUser.id,
    });
    await this.preferencesRepository.save(preferences);

    await this.logActivity(
      savedUser.id,
      ActivityType.PROFILE_UPDATE,
      'User registered',
    );

    return this.toResponseDto(savedUser);
  }

  async findById(id: string, isPublicView = false): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['preferences', 'achievements'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (isPublicView && !user.preferences?.profileVisibility) {
      throw new NotFoundException('User profile is private');
    }

    return this.toResponseDto(user, isPublicView);
  }

  async findAll(searchDto: SearchUserDto) {
    const { page, limit, query, role, status, location, sortBy, sortOrder } =
      searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferences', 'preferences');

    if (query) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.username ILIKE :query OR user.email ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (location) {
      queryBuilder.andWhere('user.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder).skip(skip).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users.map((user) => this.toResponseDto(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findUserById(id);

    Object.assign(user, {
      ...updateUserDto,
      dateOfBirth: updateUserDto.dateOfBirth
        ? new Date(updateUserDto.dateOfBirth)
        : user.dateOfBirth,
    });

    const updatedUser = await this.userRepository.save(user);
    await this.logActivity(id, ActivityType.PROFILE_UPDATE, 'Profile updated');

    return this.toResponseDto(updatedUser);
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdateUserPasswordDto,
  ): Promise<void> {
    const user = await this.findUserById(id);

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      updatePasswordDto.newPassword,
      saltRounds,
    );

    user.password = hashedPassword;
    await this.userRepository.save(user);
    await this.logActivity(
      id,
      ActivityType.PASSWORD_CHANGE,
      'Password changed',
    );
  }

  async uploadAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    const user = await this.findUserById(id);

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    user.avatarUrl = avatarUrl;

    await this.userRepository.save(user);
    await this.logActivity(id, ActivityType.AVATAR_UPLOAD, 'Avatar uploaded');

    return { avatarUrl };
  }

  async getUserPreferences(id: string) {
    const preferences = await this.preferencesRepository.findOne({
      where: { userId: id },
    });

    if (!preferences) {
      // Create default preferences if they don't exist
      const newPreferences = this.preferencesRepository.create({
        userId: id,
      });
      return await this.preferencesRepository.save(newPreferences);
    }

    return preferences;
  }

  async updateUserPreferences(
    id: string,
    preferencesDto: UpdateUserPreferencesDto,
  ) {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId: id },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId: id,
        ...preferencesDto,
      });
    } else {
      Object.assign(preferences, preferencesDto);
    }

    const updatedPreferences =
      await this.preferencesRepository.save(preferences);
    await this.logActivity(
      id,
      ActivityType.SETTINGS_UPDATE,
      'User preferences updated',
    );

    return updatedPreferences;
  }

  async getUserAchievements(id: string) {
    const achievements = await this.achievementRepository.find({
      where: { userId: id, isVisible: true },
      order: { earnedAt: 'DESC' },
    });

    return achievements;
  }

  async getUserActivities(id: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await this.activityRepository.findAndCount({
      where: { userId: id },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchUsers(searchDto: SearchUserDto) {
    const { page, limit, query, role, status, location, sortBy, sortOrder } =
      searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferences', 'preferences')
      .where('preferences.profileVisibility = :visibility', {
        visibility: true,
      });

    if (query) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.username ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (location) {
      queryBuilder.andWhere('user.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    // Only show active users in search
    queryBuilder.andWhere('user.status = :activeStatus', {
      activeStatus: UserStatus.ACTIVE,
    });

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder).skip(skip).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users.map((user) => this.toResponseDto(user, true)), // true for public view
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStats(): Promise<UserStatsDto> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { status: UserStatus.ACTIVE },
    });
    const verifiedUsers = await this.userRepository.count({
      where: { isEmailVerified: true },
    });

    // Users created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await this.userRepository.count({
      where: { createdAt: { $gte: startOfMonth } as any },
    });

    // Users by role
    const usersByRole = {
      [UserRole.USER]: await this.userRepository.count({
        where: { role: UserRole.USER },
      }),
      [UserRole.ADMIN]: await this.userRepository.count({
        where: { role: UserRole.ADMIN },
      }),
      [UserRole.MODERATOR]: await this.userRepository.count({
        where: { role: UserRole.MODERATOR },
      }),
    };

    // Users by status
    const usersByStatus = {
      [UserStatus.ACTIVE]: await this.userRepository.count({
        where: { status: UserStatus.ACTIVE },
      }),
      [UserStatus.INACTIVE]: await this.userRepository.count({
        where: { status: UserStatus.INACTIVE },
      }),
      [UserStatus.SUSPENDED]: await this.userRepository.count({
        where: { status: UserStatus.SUSPENDED },
      }),
      [UserStatus.DEACTIVATED]: await this.userRepository.count({
        where: { status: UserStatus.DEACTIVATED },
      }),
    };

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      verifiedUsers,
      usersByRole,
      usersByStatus,
    };
  }

  async updateStatus(id: string, status: string): Promise<UserResponseDto> {
    const user = await this.findUserById(id);

    if (!Object.values(UserStatus).includes(status as UserStatus)) {
      throw new BadRequestException('Invalid status');
    }

    user.status = status as UserStatus;

    if (status === UserStatus.DEACTIVATED) {
      user.deactivatedAt = new Date();
    }

    const updatedUser = await this.userRepository.save(user);
    await this.logActivity(
      id,
      ActivityType.SETTINGS_UPDATE,
      `Status updated to ${status}`,
    );

    return this.toResponseDto(updatedUser);
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await this.findUserById(id);

    user.status = UserStatus.DEACTIVATED;
    user.deactivatedAt = new Date();

    await this.userRepository.save(user);
    await this.logActivity(
      id,
      ActivityType.SETTINGS_UPDATE,
      'Account deactivated',
    );
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findUserById(id);

    // Log deletion before removing the user
    await this.logActivity(id, ActivityType.SETTINGS_UPDATE, 'Account deleted');

    // Delete user (cascade will handle related records)
    await this.userRepository.remove(user);
  }

  // Private helper methods
  private async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async logActivity(
    userId: string,
    type: ActivityType,
    description: string,
    metadata?: Record<string, any>,
    req?: AuthRequest,
  ): Promise<void> {
    const activity = this.activityRepository.create({
      userId,
      type,
      description,
      metadata,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    });

    await this.activityRepository.save(activity);
  }

  private toResponseDto(user: User, isPublicView = false): UserResponseDto {
    const responseDto = plainToClass(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });

    return responseDto;
  }
}
