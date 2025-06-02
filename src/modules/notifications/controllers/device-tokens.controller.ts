import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeviceTokenService } from '../services/device-token.service';
import { IsOptional, IsString } from 'class-validator';
import { Request as ExpressRequest } from 'express';

export class RegisterDeviceTokenDto {
  @IsString()
  token: string;

  @IsString()
  platform: string; // 'ios', 'android', 'web'

  @IsOptional()
  @IsString()
  deviceId?: string;
}

@ApiTags('device-tokens')
@Controller('notifications/device-tokens')
// @UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviceTokensController {
  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  @Post()
  @ApiOperation({ summary: 'Register device token for push notifications' })
  async registerToken(
    @Request() req: ExpressRequest,
    @Body() registerDto: RegisterDeviceTokenDto,
  ) {
    const userId = (req as any).user?.id;
    return await this.deviceTokenService.registerToken(userId, registerDto);
  }
  

  @Delete(':token')
  @ApiOperation({ summary: 'Remove device token' })
  async removeToken(
    @Request() req: ExpressRequest,
    @Param('token') token: string,
  ) {
    const userId = (req as any).user?.id;
    return await this.deviceTokenService.removeToken(userId, token);
  }
}
