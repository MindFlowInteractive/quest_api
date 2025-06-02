import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationService } from './services/notifications.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [NotificationsController],
  providers: [NotificationService],
})
export class NotificationsModule {}
