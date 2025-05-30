import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DataExportService } from './data-export.service';
import { DataImportService } from './data-import.service';
import { BackupService } from './backup.service';
import {
  ExportDataDto,
  ImportDataDto,
  ExportFormat,
} from './dto/data-export.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Controller('data-export')
export class DataExportController {
  constructor(
    private readonly exportService: DataExportService,
    private readonly importService: DataImportService,
    private readonly backupService: BackupService,
  ) {}

  @Post('export/user/:userId')
  async exportUserData(
    @Param('userId') userId: string,
    @Body() exportDto: ExportDataDto,
  ) {
    const result = await this.exportService.exportUserData(
      userId,
      exportDto.format,
      {
        entities: exportDto.entities,
        includeMetadata: exportDto.includeMetadata,
        anonymize: exportDto.anonymize,
      },
    );

    return {
      success: result.success,
      message: result.success
        ? 'Export completed successfully'
        : 'Export failed',
      data: {
        recordCount: result.recordCount,
        checksum: result.checksum,
        filePath: result.filePath,
      },
      errors: result.errors,
    };
  }

  @Post('export/puzzle/:puzzleId')
  async exportPuzzleData(
    @Param('puzzleId') puzzleId: string,
    @Query('format') format: ExportFormat = ExportFormat.JSON,
  ) {
    const result = await this.exportService.exportPuzzleData(puzzleId, format);

    return {
      success: result.success,
      message: result.success
        ? 'Puzzle export completed successfully'
        : 'Puzzle export failed',
      data: {
        recordCount: result.recordCount,
        checksum: result.checksum,
        filePath: result.filePath,
      },
      errors: result.errors,
    };
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importData(
    @UploadedFile() file: Express.Multer.File,
    @Body() importDto: ImportDataDto,
    @Query('userId') userId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Save uploaded file temporarily
    const tempPath = path.join(
      './temp',
      `import_${Date.now()}_${file.originalname}`,
    );
    await fs.mkdir('./temp', { recursive: true });
    await fs.writeFile(tempPath, file.buffer);

    try {
      const result = await this.importService.importData(
        tempPath,
        importDto.format,
        {
          validateOnly: importDto.validateOnly,
          skipErrors: importDto.skipErrors,
          userId,
        },
      );

      return {
        success: result.success,
        message: result.success
          ? 'Import completed successfully'
          : 'Import completed with errors',
        data: {
          recordsProcessed: result.recordsProcessed,
          recordsImported: result.recordsImported,
        },
        errors: result.errors,
        warnings: result.warnings,
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  @Post('validate')
  @UseInterceptors(FileInterceptor('file'))
  async validateImportFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('format') format: ExportFormat,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const tempPath = path.join(
      './temp',
      `validate_${Date.now()}_${file.originalname}`,
    );
    await fs.mkdir('./temp', { recursive: true });
    await fs.writeFile(tempPath, file.buffer);

    try {
      const result = await this.importService.validateFile(tempPath, format);

      return {
        valid: result.success,
        errors: result.errors,
        warnings: result.warnings,
      };
    } finally {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  @Get('download/:fileName')
  async downloadExportFile(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const filePath = path.join(
      process.env.EXPORT_BASE_PATH || './exports',
      fileName,
    );

    try {
      await fs.access(filePath);
      res.download(filePath);
    } catch {
      res.status(HttpStatus.NOT_FOUND).json({
        message: 'File not found',
      });
    }
  }

  @Post('verify/:fileName')
  async verifyDataIntegrity(
    @Param('fileName') fileName: string,
    @Body('checksum') expectedChecksum: string,
  ) {
    const filePath = path.join(
      process.env.EXPORT_BASE_PATH || './exports',
      fileName,
    );

    const isValid = await this.exportService.verifyDataIntegrity(
      filePath,
      expectedChecksum,
    );

    return {
      valid: isValid,
      message: isValid
        ? 'Data integrity verified'
        : 'Data integrity check failed',
    };
  }

  @Post('backup/create')
  async createBackup() {
    const result = await this.backupService.createFullBackup();

    return {
      success: result.success,
      message: result.success
        ? 'Backup created successfully'
        : 'Backup creation failed',
      data: result.success
        ? {
            filePath: result.filePath,
            checksum: result.checksum,
          }
        : null,
      errors: result.errors,
    };
  }

  @Post('backup/restore')
  @UseInterceptors(FileInterceptor('file'))
  async restoreBackup(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Backup file is required');
    }

    const tempPath = path.join(
      './temp',
      `restore_${Date.now()}_${file.originalname}`,
    );
    await fs.mkdir('./temp', { recursive: true });
    await fs.writeFile(tempPath, file.buffer);

    try {
      const result = await this.backupService.restoreFromBackup(tempPath);

      return {
        success: result.success,
        message: result.success
          ? 'Restore completed successfully'
          : 'Restore completed with errors',
        data: {
          recordsRestored: result.recordsRestored,
        },
        errors: result.errors,
      };
    } finally {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  @Get('backup/list')
  async listBackups() {
    const backups = await this.backupService.listBackups();

    return {
      success: true,
      data: backups,
    };
  }

  @Get('formats')
  getAvailableFormats() {
    return {
      formats: Object.values(ExportFormat),
      descriptions: {
        [ExportFormat.JSON]:
          'JavaScript Object Notation - structured data format',
        [ExportFormat.CSV]: 'Comma Separated Values - tabular data format',
        [ExportFormat.XML]:
          'Extensible Markup Language - hierarchical data format',
      },
    };
  }
}
