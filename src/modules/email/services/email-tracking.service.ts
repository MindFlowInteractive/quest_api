import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  EmailTracking,
  EmailTrackingStatus,
} from '../entities/email-tracking.entity';
import { EmailOptions } from '../interfaces/email-provider.interface';

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    @InjectRepository(EmailTracking)
    private readonly trackingRepository: Repository<EmailTracking>,
  ) {}

  async createTrackingRecord(options: EmailOptions): Promise<string> {
    const trackingId = uuidv4();
    const tracking = this.trackingRepository.create({
      id: trackingId,
      recipient: Array.isArray(options.to) ? options.to.join(',') : options.to,
      status: EmailTrackingStatus.PENDING,
      metadata: {
        templateId: options.templateId,
        ...options.metadata,
      },
    });

    await this.trackingRepository.save(tracking);
    return trackingId;
  }

  async updateTrackingStatus(
    trackingId: string,
    status: EmailTrackingStatus,
    messageId?: string,
    error?: string,
  ): Promise<void> {
    const tracking = await this.trackingRepository.findOne({
      where: { id: trackingId },
    });

    if (!tracking) {
      this.logger.warn(`Tracking record not found: ${trackingId}`);
      return;
    }

    tracking.status = status;
    if (messageId) {
      tracking.messageId = messageId;
    }
    if (error) {
      tracking.error = error;
    }

    await this.trackingRepository.save(tracking);
  }

  async recordEmailEvent(
    messageId: string,
    eventType: EmailTrackingStatus,
    eventData: Record<string, any>,
  ): Promise<void> {
    const tracking = await this.trackingRepository.findOne({
      where: { messageId },
    });

    if (!tracking) {
      this.logger.warn(`Tracking record not found for message: ${messageId}`);
      return;
    }

    tracking.status = eventType;
    tracking.events = tracking.events || [];
    tracking.events.push({
      type: eventType,
      timestamp: new Date(),
      data: eventData,
    });

    await this.trackingRepository.save(tracking);
  }

  async getTrackingStatus(messageId: string): Promise<EmailTracking> {
    const tracking = await this.trackingRepository.findOne({
      where: { messageId },
    });
    if (!tracking) {
      throw new NotFoundException(
        `No tracking record found for message ID: ${messageId}`,
      );
    }
    return tracking;
  }

  async getEmailStats(): Promise<{
    total: number;
    sent: number;
    failed: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  }> {
    const stats = await this.trackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tracking.status')
      .getRawMany();

    const result = {
      total: 0,
      sent: 0,
      failed: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    };

    stats.forEach((stat: { status: keyof typeof result; count: string }) => {
      if (stat.status in result) {
        result[stat.status] = parseInt(stat.count, 10);
        result.total += parseInt(stat.count, 10);
      }
    });

    return result;
  }
}
