import { Injectable, Inject } from '@nestjs/common';
import { EMAIL_PROVIDER } from '../constants';
import { EmailProvider } from '../interfaces/email-provider.interface';

@Injectable()
export class EmailProviderFactory {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {}

  getProvider(): EmailProvider {
    return this.provider;
  }
}
