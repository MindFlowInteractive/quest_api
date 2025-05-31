import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EmailPreferences } from '../entities/email-preferences.entity';

@Injectable()
export class EmailPreferencesService {
  private readonly logger = new Logger(EmailPreferencesService.name);

  constructor(
    @InjectRepository(EmailPreferences)
    private readonly preferencesRepository: Repository<EmailPreferences>,
  ) {}

  async getPreferences(email: string): Promise<EmailPreferences> {
    const preferences = await this.preferencesRepository.findOne({
      where: { email },
    });
    if (!preferences) {
      throw new NotFoundException(`No preferences found for email: ${email}`);
    }
    return preferences;
  }

  async updatePreferences(
    email: string,
    updates: Partial<EmailPreferences['preferences']>,
  ): Promise<EmailPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { email },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        email,
        preferences: updates,
        unsubscribeToken: uuidv4(),
      });
    } else {
      preferences.preferences = {
        ...preferences.preferences,
        ...updates,
      };
    }

    return this.preferencesRepository.save(preferences);
  }

  async hasOptedOut(email: string): Promise<boolean> {
    const preferences = await this.preferencesRepository.findOne({
      where: { email },
    });
    return preferences?.preferences?.unsubscribed === true;
  }

  async unsubscribe(email: string, token: string): Promise<boolean> {
    const preferences = await this.preferencesRepository.findOne({
      where: { email, unsubscribeToken: token },
    });

    if (!preferences) {
      return false;
    }

    preferences.preferences = {
      ...preferences.preferences,
      unsubscribed: true,
    };

    await this.preferencesRepository.save(preferences);
    return true;
  }

  async resubscribe(email: string): Promise<void> {
    const preferences = await this.preferencesRepository.findOne({
      where: { email },
    });

    if (!preferences) {
      throw new NotFoundException(`No preferences found for email: ${email}`);
    }

    preferences.preferences = {
      ...preferences.preferences,
      unsubscribed: false,
    };

    await this.preferencesRepository.save(preferences);
  }

  async canReceiveEmailType(
    email: string,
    type: keyof EmailPreferences['preferences'],
  ): Promise<boolean> {
    const preferences = await this.getPreferences(email);
    return (
      !preferences.preferences.unsubscribed && preferences.preferences[type]
    );
  }

  async generateUnsubscribeLink(email: string): Promise<string> {
    const preferences = await this.getPreferences(email);
    return `/email/unsubscribe?email=${encodeURIComponent(email)}&token=${preferences.unsubscribeToken}`;
  }
}
