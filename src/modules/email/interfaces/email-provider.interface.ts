export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  trackingId?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResponse {
  messageId: string;
  provider: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<{ messageId: string }>;
  validateEmail(email: string): Promise<boolean>;
  getProviderName(): string;
}

export interface EmailProviderConfig {
  apiKey: string;
  from: string;
  region?: string;
  endpoint?: string;
}
