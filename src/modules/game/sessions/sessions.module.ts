import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsGateway } from './sessions.gateway';
import { SessionEntity } from './entities/session.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity])],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsGateway],
  exports: [SessionsService],
})
export class SessionsModule {}
