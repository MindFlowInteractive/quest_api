export enum NotificationType {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
}

export enum NotificationCategory {
  GAME_UPDATE = 'game_update',
  ACHIEVEMENT = 'achievement',
  SOCIAL = 'social',
  SYSTEM = 'system',
  PROMOTIONAL = 'promotional',
  REMINDER = 'reminder',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
