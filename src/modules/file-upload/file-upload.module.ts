import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { MulterModule } from "@nestjs/platform-express"
import { ScheduleModule } from "@nestjs/schedule"
import { FileEntity } from "./entities/file.entity"
import { FileMetadata } from "./entities/file-metadata.entity"
import { FileAnalytics } from "./entities/file-analytics.entity"
import { FileShare } from "./entities/file-share.entity"
import { User } from "@/modules/data-system/entities/user.entity"
import { FileUploadController } from "./controllers/file-upload.controller"
import { FileUploadService } from "./providers/file-upload.service"
import { StorageService } from "./providers/storage.service"
import { MediaProcessingService } from "./providers/media-processing.service"
import { FileValidationService } from "./providers/file-validation.service"
import { FileMetadataService } from "./providers/file-metadata.service"
import { FileAnalyticsService } from "./providers/file-analytics.service"
import { FileSharingService } from "./providers/file-sharing.service"
import { FileBackupService } from "./providers/file-backup.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity, FileMetadata, FileAnalytics, FileShare, User]),
    MulterModule.register({
      dest: "./temp",
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 10,
      },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [FileUploadController],
  providers: [
    FileUploadService,
    StorageService,
    MediaProcessingService,
    FileValidationService,
    FileMetadataService,
    FileAnalyticsService,
    FileSharingService,
    FileBackupService,
  ],
  exports: [FileUploadService, StorageService, MediaProcessingService, FileMetadataService],
})
export class FileUploadModule {}
