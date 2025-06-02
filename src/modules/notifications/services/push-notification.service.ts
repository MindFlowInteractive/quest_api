// src/notifications/services/push-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
}

export interface PushResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase:', error);
    }
  }

  public async sendToToken(token: string, payload: PushPayload): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          ...payload.data,
          actionUrl: payload.actionUrl || '',
        },
        android: {
          notification: {
            channelId: 'default',
            priority: 'high' as const,
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.debug(`Push notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send push notification to ${token}:`, error);
      return false;
    }
  }

  public async sendToTokens(tokens: string[], payload: PushPayload): Promise<PushResult> {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          ...payload.data,
          actionUrl: payload.actionUrl || '',
        },
        android: {
          notification: {
            channelId: 'default',
            priority: 'high' as const,
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const invalidTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error('Failed to send multicast push notification:', error);
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  }

  public async sendToTopic(topic: string, payload: PushPayload): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          ...payload.data,
          actionUrl: payload.actionUrl || '',
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.debug(`Topic notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send topic notification to ${topic}:`, error);
      return false;
    }
  }

  public async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.debug(`Subscribed ${tokens.length} tokens to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}:`, error);
    }
  }

  public async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.debug(`Unsubscribed ${tokens.length} tokens from topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic ${topic}:`, error);
    }
  }
}