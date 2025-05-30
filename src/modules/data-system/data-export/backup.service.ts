import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Puzzle } from '../entities/puzzle.entity';
import { DataExportService } from './data-export.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupPath = process.env.BACKUP_PATH || './backups';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
    private dataExportService: DataExportService,
  ) {}

  @Cron(process.env.BACKUP_SCHEDULE_CRON || CronExpression.EVERY_DAY_AT_2AM)
  async performScheduledBackup(): Promise<void> {
    this.logger.log('Starting scheduled backup...');
    try {
      const result = await this.createFullBackup();
      if (result.success) {
        this.logger.log(`Backup completed successfully: ${result.filePath}`);
        await this.cleanupOldBackups();
      } else {
        this.logger.error('Backup failed:', result.errors);
      }
    } catch (error) {
      this.logger.error('Scheduled backup failed:', error);
    }
  }

  private async saveBackupMetadata(
    fileName: string,
    checksum: string,
    metadata: any,
  ): Promise<void> {
    const metadataFile = path.join(this.backupPath, 'backup_metadata.json');
    let existingMetadata: any[] = [];
    try {
      const content = await fs.readFile(metadataFile, 'utf-8');
      existingMetadata = JSON.parse(content);
    } catch {
      // No metadata file yet
    }

    existingMetadata.push({
      fileName,
      checksum,
      ...metadata,
    });

    await fs.writeFile(metadataFile, JSON.stringify(existingMetadata, null, 2));
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const retentionDays = parseInt(process.env.EXPORT_RETENTION_DAYS || '30');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const files = await fs.readdir(this.backupPath);

      for (const file of files) {
        if (file.startsWith('full_backup_') && file.endsWith('.json')) {
          const filePath = path.join(this.backupPath, file);
          const stats = await fs.stat(filePath);
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            this.logger.log(`Deleted old backup: ${file}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old backups:', error);
    }
  }

  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async listBackups(): Promise<
    Array<{
      fileName: string;
      size: number;
      createdAt: Date;
      checksum?: string;
    }>
  > {
    try {
      const files = await fs.readdir(this.backupPath);
      const backups = [];

      for (const file of files) {
        if (file.startsWith('full_backup_') && file.endsWith('.json')) {
          const filePath = path.join(this.backupPath, file);
          const stats = await fs.stat(filePath);
          backups.push({
            fileName: file,
            size: stats.size,
            createdAt: stats.mtime,
          });
        }
      }

      return backups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    } catch (error) {
      this.logger.error('Failed to list backups:', error);
      return [];
    }
  }

  async createFullBackup(): Promise<{
    success: boolean;
    filePath?: string;
    checksum?: string;
    errors?: string[];
  }> {
    try {
      const users = await this.userRepository.find({
        relations: ['puzzles'],
      });

      const backupData = {
        metadata: {
          backupDate: new Date(),
          version: '1.0',
          totalUsers: users.length,
          totalPuzzles: users.reduce(
            (sum, user) => sum + user.puzzles.length,
            0,
          ),
        },
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          puzzles: user.puzzles.map((puzzle) => ({
            id: puzzle.id,
            title: puzzle.title,
            description: puzzle.description,
            solution: puzzle.solution,
            difficulty: puzzle.difficulty,
            metadata: puzzle.metadata,
            isActive: puzzle.isActive,
            createdAt: puzzle.createdAt,
            updatedAt: puzzle.updatedAt,
          })),
        })),
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `full_backup_${timestamp}.json`;
      const filePath = path.join(this.backupPath, fileName);

      await this.ensureDirectoryExists(this.backupPath);

      const content = JSON.stringify(backupData, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');

      const checksum = this.generateChecksum(content);
      await this.saveBackupMetadata(fileName, checksum, backupData.metadata);

      return {
        success: true,
        filePath,
        checksum,
      };
    } catch (error) {
      this.logger.error('Full backup failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async restoreFromBackup(backupFilePath: string): Promise<{
    success: boolean;
    recordsRestored: number;
    errors?: string[];
  }> {
    try {
      const content = await fs.readFile(backupFilePath, 'utf-8');
      const backupData = JSON.parse(content);

      let recordsRestored = 0;
      const errors: string[] = [];

      for (const userData of backupData.users || []) {
        try {
          let user = await this.userRepository.findOne({
            where: { email: userData.email },
          });

          if (user) {
            await this.userRepository.update(user.id, {
              name: userData.name,
              phoneNumber: userData.phoneNumber,
              preferences: userData.preferences,
            });
          } else {
            user = await this.userRepository.save({
              id: userData.id,
              email: userData.email,
              name: userData.name,
              phoneNumber: userData.phoneNumber,
              preferences: userData.preferences,
              createdAt: new Date(userData.createdAt),
              updatedAt: new Date(userData.updatedAt),
            });
          }

          recordsRestored++;

          for (const puzzleData of userData.puzzles || []) {
            try {
              const existingPuzzle = await this.puzzleRepository.findOne({
                where: { id: puzzleData.id },
              });

              if (existingPuzzle) {
                await this.puzzleRepository.update(puzzleData.id, {
                  title: puzzleData.title,
                  description: puzzleData.description,
                  solution: puzzleData.solution,
                  difficulty: puzzleData.difficulty,
                  metadata: puzzleData.metadata,
                  isActive: puzzleData.isActive,
                  updatedAt: new Date(puzzleData.updatedAt),
                });
              } else {
                await this.puzzleRepository.save({
                  id: puzzleData.id,
                  title: puzzleData.title,
                  description: puzzleData.description,
                  solution: puzzleData.solution,
                  difficulty: puzzleData.difficulty,
                  metadata: puzzleData.metadata,
                  isActive: puzzleData.isActive,
                  createdAt: new Date(puzzleData.createdAt),
                  updatedAt: new Date(puzzleData.updatedAt),
                  user: { id: user.id },
                });
              }

              recordsRestored++;
            } catch (error) {
              errors.push(
                `Failed to restore puzzle ${puzzleData.id}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }
        } catch (error) {
          errors.push(
            `Failed to restore user ${userData.email}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      return {
        success: errors.length === 0,
        recordsRestored,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to restore from backup:', error);
      return {
        success: false,
        recordsRestored: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }
}
