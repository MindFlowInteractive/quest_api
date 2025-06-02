import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { DeviceToken } from '../entities/device-token.entity';

export interface RegisterTokenDto {
  token: string;
  platform: string;
  deviceId?: string;
}

@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
  ) {}

  async registerToken(
    userId: string,
    dto: RegisterTokenDto,
  ): Promise<DeviceToken> {
    // Check if token already exists
    const existingToken = await this.deviceTokenRepository.findOne({
      where: { token: dto.token },
    });

    if (existingToken) {
      // Update existing token
      existingToken.userId = userId;
      existingToken.platform = dto.platform;
      // existingToken.deviceId = dto.deviceId;
      existingToken.isActive = true;
      existingToken.lastUsedAt = new Date();

      return await this.deviceTokenRepository.save(existingToken);
    }

    // Create new token
    const deviceToken = this.deviceTokenRepository.create({
      userId,
      token: dto.token,
      platform: dto.platform,
      deviceId: dto.deviceId,
      isActive: true,
      lastUsedAt: new Date(),
    });

    return await this.deviceTokenRepository.save(deviceToken);
  }

  async removeToken(userId: string, token: string): Promise<boolean> {
    const result = await this.deviceTokenRepository.update(
      { userId, token },
      { isActive: false },
    );

    return (result.affected ?? 0) > 0;
  }

  async getActiveTokensForUser(userId: string): Promise<DeviceToken[]> {
    return await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
    });
  }

  async markTokenAsInvalid(token: string): Promise<void> {
    await this.deviceTokenRepository.update({ token }, { isActive: false });
  }

  async cleanupInactiveTokens(daysInactive = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    await this.deviceTokenRepository.update(
      { lastUsedAt: LessThan(cutoffDate) },
      { isActive: false },
    );

    this.logger.log(
      `Cleaned up inactive tokens older than ${daysInactive} days`,
    );
  }
}
