import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PreferencesService } from '../services/preferences.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

@ApiTags('notification-preferences')
@Controller('notifications/preferences')
// @UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getPreferences(@Request() req: any) {
    const userId = req.user?.id;
    return await this.preferencesService.getUserPreferences(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Request() req: any,
    @Body() updateDto: UpdatePreferencesDto,
  ) {
    const userId = req.user?.id;
    return await this.preferencesService.updatePreferences(userId, updateDto);
  }
}