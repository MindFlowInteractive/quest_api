import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityService } from './security.service';
import { ApiKey } from './entities/api-key.entity';
import { SecurityController } from './security.controller';
import { RequestLog } from './entities/request-log.entity';
import { AbuseDetectionService } from './services/abuse-detection.service';
import { RequestValidationService } from './services/request-validation.service';
import { ApiKeyService } from './services/api-key.service';
import { MonitoringService } from './services/monitoring.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey, RequestLog]),
  ],
  controllers: [SecurityController],
  providers: [
    SecurityService,
    AbuseDetectionService,
    RequestValidationService,
    ApiKeyService,
    MonitoringService,
  ],
  exports: [
    SecurityService,
    AbuseDetectionService,
    RequestValidationService,
    ApiKeyService,
    MonitoringService,
  ],
})
export class SecurityModule {}
