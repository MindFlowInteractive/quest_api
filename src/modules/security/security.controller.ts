import { Controller, Post, Body, Get, Query, UseGuards, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyService } from './services/api-key.service';
import { AbuseDetectionService } from './services/abuse-detection.service';
import { MonitoringService } from './services/monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('security')
@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly abuseDetectionService: AbuseDetectionService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @Post('api-keys')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createApiKey(@Body() createApiKeyDto: any) {
    return this.apiKeyService.createApiKey(
      createApiKeyDto.name,
      createApiKeyDto,
    );
  }

  @Get('metrics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get API metrics' })
  async getMetrics(@Query('timeWindow') timeWindow: number = 3600) {
    return this.monitoringService.getEndpointMetrics(timeWindow);
  }

  @Get('abuse/metrics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get abuse metrics for an IP' })
  async getAbuseMetrics(
    @Query('ip') ip: string,
    @Query('timeWindow') timeWindow: number,
  ) {
    return this.abuseDetectionService.getAbuseMetrics(ip, timeWindow);
  }

  @Delete('abuse/unblock/:ip')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unblock an IP address' })
  async unblockIp(@Param('ip') ip: string) {
    await this.abuseDetectionService.unblockIp(ip);
    return { message: 'IP unblocked successfully' };
  }

  @Get('performance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get performance metrics' })
  async getPerformanceMetrics(
    @Query('threshold') threshold: number = 1000,
  ) {
    const [slowEndpoints, errorRates] = await Promise.all([
      this.monitoringService.getSlowEndpoints(threshold),
      this.monitoringService.getErrorRates(),
    ]);

    return {
      slowEndpoints,
      errorRates,
    };
  }
}
