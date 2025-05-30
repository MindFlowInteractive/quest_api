import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './data-export.service';
import { DataImportService } from './data-import.service';
import { BackupService } from './backup.service';
import { User } from '../entities/user.entity';
import { Puzzle } from '../entities/puzzle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Puzzle]),
    ScheduleModule.forRoot(),
    MulterModule.register({
      dest: './temp',
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  ],
  controllers: [DataExportController],
  providers: [DataExportService, DataImportService, BackupService],
  exports: [DataExportService, DataImportService, BackupService],
})
export class DataExportModule {}
