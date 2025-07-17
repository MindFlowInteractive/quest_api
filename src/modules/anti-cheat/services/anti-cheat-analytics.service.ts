import { Injectable } from '@nestjs/common';

export interface CheatDetectionEvent {
  userId: string;
  puzzleId: string;
  puzzleType: string;
  detectedAt: Date;
  detectionType: string;
  details?: any;
}

export interface AntiCheatAnalytics {
  totalSubmissions: number;
  totalCheatDetections: number;
  falsePositives: number;
  falseNegatives: number;
  detectionRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  lastUpdated: Date;
}

@Injectable()
export class AntiCheatAnalyticsService {
  private events: CheatDetectionEvent[] = [];
  private analytics: AntiCheatAnalytics = {
    totalSubmissions: 0,
    totalCheatDetections: 0,
    falsePositives: 0,
    falseNegatives: 0,
    detectionRate: 0,
    falsePositiveRate: 0,
    falseNegativeRate: 0,
    lastUpdated: new Date(),
  };

  recordSubmission(isCheat: boolean, event?: CheatDetectionEvent) {
    this.analytics.totalSubmissions++;
    if (isCheat && event) {
      this.analytics.totalCheatDetections++;
      this.events.push(event);
    }
    this.updateRates();
  }

  recordFalsePositive() {
    this.analytics.falsePositives++;
    this.updateRates();
  }

  recordFalseNegative() {
    this.analytics.falseNegatives++;
    this.updateRates();
  }

  getAnalytics(): AntiCheatAnalytics {
    return this.analytics;
  }

  getEvents(): CheatDetectionEvent[] {
    return this.events;
  }

  private updateRates() {
    this.analytics.detectionRate = this.analytics.totalSubmissions
      ? this.analytics.totalCheatDetections / this.analytics.totalSubmissions
      : 0;
    this.analytics.falsePositiveRate = this.analytics.totalCheatDetections
      ? this.analytics.falsePositives / this.analytics.totalCheatDetections
      : 0;
    this.analytics.falseNegativeRate = this.analytics.totalCheatDetections
      ? this.analytics.falseNegatives / this.analytics.totalCheatDetections
      : 0;
    this.analytics.lastUpdated = new Date();
  }
}
