import { Injectable } from '@nestjs/common';
import { EmailProvider } from '../interfaces/email-provider.interface';
import { EmailOptions } from '../interfaces/email-provider.interface';

@Injectable()
export class MockEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
    // Mock implementation - just log the email and return a mock response
    console.log('Mock email sent:', {
      to: options.to,
      subject: options.subject,
    });
    return {
      messageId: 'mock-message-id',
    };
  }

  async validateEmail(email: string): Promise<boolean> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getProviderName(): string {
    return 'mock';
  }
}
