import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadService } from './file-upload.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from '../entities/file.entity';
import { FileMetadata } from '../entities/file-metadata.entity';
import { StorageService } from './storage.service';
import { MediaProcessingService } from './media-processing.service';
import { FileValidationService } from './file-validation.service';
import { FileMetadataService } from './file-metadata.service';
import { FileAnalyticsService } from './file-analytics.service';

describe('FileUploadService', () => {
  let service: FileUploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        { provide: getRepositoryToken(FileEntity), useValue: {} },
        { provide: getRepositoryToken(FileMetadata), useValue: {} },
        { provide: Repository, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: MediaProcessingService, useValue: {} },
        { provide: FileValidationService, useValue: {} },
        { provide: FileMetadataService, useValue: {} },
        { provide: FileAnalyticsService, useValue: {} },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
