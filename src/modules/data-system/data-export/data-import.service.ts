import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Puzzle } from '../entities/puzzle.entity';
import { ExportFormat } from './dto/data-export.dto';
import * as fs from 'fs/promises';
import * as csv from 'csv-parser';
import * as xml2js from 'xml2js';
import { Readable } from 'stream';

export interface ImportResult {
  success: boolean;
  recordsProcessed: number;
  recordsImported: number;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
  ) {}

  async importData(
    filePath: string,
    format: ExportFormat,
    options: {
      validateOnly?: boolean;
      skipErrors?: boolean;
      userId?: string;
    } = {},
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      recordsProcessed: 0,
      recordsImported: 0,
      errors: [],
      warnings: [],
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let data: Record<string, unknown>;

      switch (format) {
        case ExportFormat.JSON:
          data = JSON.parse(content) as Record<string, unknown>;
          break;
        case ExportFormat.CSV:
          data = await this.parseCSV(content);
          break;
        case ExportFormat.XML:
          data = await this.parseXML(content);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const validationResult = this.validateImportData(data);
      result.errors.push(...validationResult.errors);
      result.warnings.push(...validationResult.warnings);

      if (options.validateOnly) {
        result.success = validationResult.errors.length === 0;
        return result;
      }

      if (validationResult.errors.length > 0 && !options.skipErrors) {
        result.success = false;
        return result;
      }

      // Import user data
      if (data.user) {
        try {
          await this.importUser(
            data.user as Record<string, unknown>,
            options.userId,
          );
          result.recordsImported++;
        } catch (error) {
          const errorMsg =
            error instanceof Error
              ? `Failed to import user: ${error.message}`
              : `Failed to import user: ${String(error)}`;
          if (options.skipErrors) {
            result.warnings.push(errorMsg);
          } else {
            result.errors.push(errorMsg);
          }
        }
        result.recordsProcessed++;
      }

      // Import puzzles data
      if (data.puzzles && Array.isArray(data.puzzles)) {
        for (const puzzleData of data.puzzles) {
          try {
            await this.importPuzzle(
              puzzleData as Record<string, unknown>,
              options.userId ||
                ((data.user as Record<string, unknown>)?.id as string),
            );
            result.recordsImported++;
          } catch (error) {
            const errorMsg =
              error instanceof Error
                ? `Failed to import puzzle ${puzzleData.id}: ${error.message}`
                : `Failed to import puzzle ${puzzleData.id}: ${String(error)}`;
            if (options.skipErrors) {
              result.warnings.push(errorMsg);
            } else {
              result.errors.push(errorMsg);
            }
          }
          result.recordsProcessed++;
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      this.logger.error('Import failed:', error);
      const errorMsg =
        error instanceof Error
          ? `Import failed: ${error.message}`
          : `Import failed: ${String(error)}`;
      result.errors.push(errorMsg);
      return result;
    }
  }

  private async parseCSV(content: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const results: Record<string, unknown>[] = [];
      const stream = Readable.from([content]);

      stream
        .pipe(csv())
        .on('data', (data: Record<string, unknown>) => results.push(data))
        .on('end', () => {
          const restructured = this.restructureFromCSV(results[0]);
          resolve(restructured);
        })
        .on('error', reject);
    });
  }

  private async parseXML(content: string): Promise<Record<string, unknown>> {
    const parser = new xml2js.Parser();
    return parser.parseStringPromise(content);
  }

  private restructureFromCSV(
    flatData: Record<string, unknown>,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    for (const key in flatData) {
      const keys = key.split('_');
      let current = data;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]] as Record<string, unknown>;
      }

      const lastKey = keys[keys.length - 1];
      let value = flatData[key];

      if (
        typeof value === 'string' &&
        (value.startsWith('[') || value.startsWith('{'))
      ) {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if parsing fails
        }
      }

      current[lastKey] = value;
    }

    return data;
  }

  private validateImportData(data: Record<string, unknown>): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('Import data is empty or invalid');
      return { errors, warnings };
    }

    const userData = data.user as Record<string, unknown> | undefined;
    if (userData) {
      if (!userData.email) {
        errors.push('User email is required');
      }
      if (!userData.name) {
        errors.push('User name is required');
      }
      if (
        userData.email &&
        typeof userData.email === 'string' &&
        !/\S+@\S+\.\S+/.test(userData.email)
      ) {
        errors.push('Invalid email format');
      }
    }

    const puzzles = data.puzzles as Array<Record<string, unknown>> | undefined;
    if (puzzles && Array.isArray(puzzles)) {
      puzzles.forEach((puzzle, index) => {
        if (!puzzle.title) {
          errors.push(`Puzzle ${index + 1}: Title is required`);
        }
        if (!puzzle.description) {
          errors.push(`Puzzle ${index + 1}: Description is required`);
        }
        if (!puzzle.solution) {
          warnings.push(`Puzzle ${index + 1}: Solution is missing`);
        }
      });
    }

    return { errors, warnings };
  }

  private async importUser(
    userData: Record<string, unknown>,
    targetUserId?: string,
  ): Promise<User> {
    let user: User | null;

    if (targetUserId) {
      user = await this.userRepository.findOne({ where: { id: targetUserId } });
      if (!user) {
        throw new Error(`User not found: ${targetUserId}`);
      }

      user.name = (userData.name as string) || user.name;
      user.phoneNumber = (userData.phoneNumber as string) || user.phoneNumber;
      user.preferences =
        (userData.preferences as Record<string, unknown>) || user.preferences;
    } else {
      user = await this.userRepository.findOne({
        where: { email: userData.email as string },
      });

      if (!user) {
        user = this.userRepository.create({
          email: userData.email,
          name: userData.name,
          phoneNumber: userData.phoneNumber,
          preferences: userData.preferences,
        });
      } else {
        // Update existing user
        user.name = userData.name || user.name;
        user.phoneNumber = userData.phoneNumber || user.phoneNumber;
        user.preferences = userData.preferences || user.preferences;
      }
    }

    // TypeScript: user is User here, not null
    return this.userRepository.save(user as User);
  }

  private async importPuzzle(
    puzzleData: Record<string, unknown>,
    userId: string,
  ): Promise<Puzzle> {
    if (!userId) {
      throw new Error('User ID is required for puzzle import');
    }

    let puzzle = await this.puzzleRepository.findOne({
      where: { id: puzzleData.id as string },
    });

    if (puzzle) {
      puzzle.title = (puzzleData.title as string) || puzzle.title;
      puzzle.description =
        (puzzleData.description as string) || puzzle.description;
      puzzle.solution = (puzzleData.solution as string) || puzzle.solution;
      puzzle.difficulty =
        (puzzleData.difficulty as string) || puzzle.difficulty;
      puzzle.metadata =
        (puzzleData.metadata as Record<string, unknown>) || puzzle.metadata;
      puzzle.isActive =
        puzzleData.isActive !== undefined
          ? Boolean(puzzleData.isActive)
          : puzzle.isActive;
    } else {
      puzzle = this.puzzleRepository.create({
        title: puzzleData.title as string,
        description: puzzleData.description as string,
        solution: (puzzleData.solution as string) || 'No solution provided',
        difficulty: (puzzleData.difficulty as string) || 'easy',
        metadata: puzzleData.metadata as Record<string, unknown>,
        isActive:
          puzzleData.isActive !== undefined
            ? Boolean(puzzleData.isActive)
            : true,
        userId: userId,
      });
    }

    return this.puzzleRepository.save(puzzle);
  }

  async validateFile(
    filePath: string,
    format: ExportFormat,
  ): Promise<ImportResult> {
    return this.importData(filePath, format, { validateOnly: true });
  }
}
