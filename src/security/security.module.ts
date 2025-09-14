import { Module, Global, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { SecurityAudit } from './entities/security-audit.entity';
import { ApiKeyService } from './services/api-key.service';
import { SecurityAuditService } from './services/security-audit.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { SecurityConfigService } from './services/security-config.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, SecurityAudit])],
  providers: [ApiKeyService, SecurityAuditService, ApiKeyGuard, SecurityConfigService],
  exports: [ApiKeyService, SecurityAuditService, ApiKeyGuard, SecurityConfigService],
})
export class SecurityModule {}
