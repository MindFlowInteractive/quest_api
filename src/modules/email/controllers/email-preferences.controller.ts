import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailPreferencesService } from '../services/email-preferences.service';
import { EmailPreferences } from '../entities/email-preferences.entity';

@ApiTags('email-preferences')
@Controller('api/v1/email/preferences')
export class EmailPreferencesController {
  constructor(private readonly preferencesService: EmailPreferencesService) {}

  @Get(':email')
  @ApiOperation({ summary: 'Get email preferences' })
  @ApiResponse({ status: 200, type: EmailPreferences })
  async getPreferences(
    @Param('email') email: string,
  ): Promise<EmailPreferences> {
    return this.preferencesService.getPreferences(email);
  }

  @Post()
  @ApiOperation({ summary: 'Update email preferences' })
  @ApiResponse({ status: 201, type: EmailPreferences })
  async updatePreferences(
    @Body()
    data: {
      email: string;
      preferences: Partial<EmailPreferences['preferences']>;
    },
  ): Promise<EmailPreferences> {
    return this.preferencesService.updatePreferences(
      data.email,
      data.preferences,
    );
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from emails' })
  @ApiResponse({ status: 200, description: 'Successfully unsubscribed' })
  async unsubscribe(
    @Body() data: { email: string; token: string },
  ): Promise<{ success: boolean }> {
    const success = await this.preferencesService.unsubscribe(
      data.email,
      data.token,
    );
    return { success };
  }

  @Post(':email/resubscribe')
  @ApiOperation({ summary: 'Resubscribe to emails' })
  @ApiResponse({ status: 200, description: 'Successfully resubscribed' })
  async resubscribe(@Param('email') email: string): Promise<void> {
    await this.preferencesService.resubscribe(email);
  }
}
