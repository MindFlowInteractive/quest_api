import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Puzzle } from '../entities/puzzle.entity';
import { ExportFormat, ExportResult } from './dto/data-export.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Parser } from 'json2csv';
import { Builder } from 'xml2js';

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);
  private readonly exportPath = process.env.EXPORT_BASE_PATH || './exports';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
  ) {}

  async exportUserData(
    userId: string,
    format: ExportFormat,
    options: {
      entities?: string[];
      includeMetadata?: boolean;
      anonymize?: boolean;
    } = {},
  ): Promise<ExportResult> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['puzzles'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      let data = this.prepareUserData(user, options);

      if (options.anonymize) {
        data = this.anonymizeData(data);
      }

      const fileName = `user_${userId}_${Date.now()}.${format}`;
      const filePath = path.join(this.exportPath, fileName);

      await this.ensureDirectoryExists(this.exportPath);

      let content: string;
      switch (format) {
        case ExportFormat.JSON:
          content = JSON.stringify(data, null, 2);
          break;
        case ExportFormat.CSV:
          content = await this.convertToCSV(data);
          break;
        case ExportFormat.XML:
          content = await this.convertToXML(data);
          break;
      }

      await fs.writeFile(filePath, content, 'utf-8');
      const checksum = this.generateChecksum(content);

      return {
        success: true,
        filePath,
        checksum,
        recordCount: this.countRecords(data),
      };
    } catch (error) {
      this.logger.error(`Export failed for user ${userId}:`, error);
      return {
        success: false,
        recordCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async exportPuzzleData(
    puzzleId: string,
    format: ExportFormat,
  ): Promise<ExportResult> {
    try {
      const puzzle = await this.puzzleRepository.findOne({
        where: { id: puzzleId },
        relations: ['user'],
      });

      if (!puzzle) {
        throw new NotFoundException('Puzzle not found');
      }

      const data = {
        puzzle: {
          id: puzzle.id,
          title: puzzle.title,
          description: puzzle.description,
          difficulty: puzzle.difficulty,
          metadata: puzzle.metadata,
          createdAt: puzzle.createdAt,
          updatedAt: puzzle.updatedAt,
        },
        creator: {
          name: puzzle.user.name,
          email: puzzle.user.email,
        },
      };

      const fileName = `puzzle_${puzzleId}_${Date.now()}.${format}`;
      const filePath = path.join(this.exportPath, fileName);

      await this.ensureDirectoryExists(this.exportPath);

      let content: string;
      switch (format) {
        case ExportFormat.JSON:
          content = JSON.stringify(data, null, 2);
          break;
        case ExportFormat.CSV:
          content = await this.convertToCSV(data);
          break;
        case ExportFormat.XML:
          content = await this.convertToXML(data);
          break;
      }

      await fs.writeFile(filePath, content, 'utf-8');
      const checksum = this.generateChecksum(content);

      return {
        success: true,
        filePath,
        checksum,
        recordCount: 1,
      };
    } catch (error) {
      this.logger.error(`Puzzle export failed for ${puzzleId}:`, error);
      return {
        success: false,
        recordCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private prepareUserData(user: User, options: any) {
    const data: any = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };

    if (!options.entities || options.entities.includes('puzzles')) {
      data.puzzles = user.puzzles.map((puzzle) => ({
        id: puzzle.id,
        title: puzzle.title,
        description: puzzle.description,
        difficulty: puzzle.difficulty,
        metadata: puzzle.metadata,
        isActive: puzzle.isActive,
        createdAt: puzzle.createdAt,
        updatedAt: puzzle.updatedAt,
      }));
    }

    if (options.includeMetadata) {
      data.exportMetadata = {
        exportedAt: new Date(),
        version: '1.0',
        format: 'complete',
      };
    }

    return data;
  }

  private anonymizeData(data: any): any {
    const anonymized = JSON.parse(JSON.stringify(data));

    if (anonymized.user) {
      anonymized.user.email = this.anonymizeEmail(anonymized.user.email);
      anonymized.user.name = 'Anonymous User';
      anonymized.user.phoneNumber = anonymized.user.phoneNumber
        ? 'XXX-XXX-XXXX'
        : null;
    }

    return anonymized;
  }

  private anonymizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    const anonymizedLocal =
      local.charAt(0) +
      '*'.repeat(local.length - 2) +
      local.charAt(local.length - 1);
    return `${anonymizedLocal}@${domain}`;
  }

  private async convertToCSV(data: any): Promise<string> {
    const flatData = this.flattenObject(data);
    const parser = new Parser();
    return parser.parse([flatData]);
  }

  private async convertToXML(data: any): Promise<string> {
    const builder = new Builder({ rootName: 'export' });
    return builder.buildObject(data);
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else if (Array.isArray(obj[key])) {
          flattened[newKey] = JSON.stringify(obj[key]);
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }

  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private countRecords(data: any): number {
    let count = 0;
    if (data.user) count++;
    if (data.puzzles) count += data.puzzles.length;
    return count;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async verifyDataIntegrity(
    filePath: string,
    expectedChecksum: string,
  ): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const actualChecksum = this.generateChecksum(content);
      return actualChecksum === expectedChecksum;
    } catch {
      return false;
    }
  }
}
