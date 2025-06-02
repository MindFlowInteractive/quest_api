import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { NotificationCategory } from '@/common/enums/notification.enum';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private preferencesRepository: Repository<NotificationPreference>,
  ) {}

  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    updateDto: UpdatePreferencesDto,
  ): Promise<NotificationPreference> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    Object.assign(preferences, updateDto);
    return await this.preferencesRepository.save(preferences);
  }

  private async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    const defaultCategories: Record<NotificationCategory, boolean> = {} as Record<NotificationCategory, boolean>;
    Object.values(NotificationCategory).forEach((category) => {
      defaultCategories[category as NotificationCategory] = true;
    });

    const preferences = this.preferencesRepository.create({
      userId,
      inAppEnabled: true,
      inAppCategories: defaultCategories,
      pushEnabled: true,
      pushCategories: defaultCategories,
      emailEnabled: true,
      emailCategories: defaultCategories,
      smsEnabled: false,
      smsCategories: defaultCategories,
      maxDailyNotifications: 10,
      maxHourlyNotifications: 3,
      timezone: 'UTC',
    });

    return await this.preferencesRepository.save(preferences);
  }

  async canSendNotification(
    userId: string,
    type: string,
    category: NotificationCategory,
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    
    switch (type) {
      case 'in_app':
        return preferences.inAppEnabled && preferences.inAppCategories[category] !== false;
      case 'push':
        return preferences.pushEnabled && preferences.pushCategories[category] !== false;
      case 'email':
        return preferences.emailEnabled && preferences.emailCategories[category] !== false;
      case 'sms':
        return preferences.smsEnabled && preferences.smsCategories[category] !== false;
      default:
        return true;
    }
  }
}