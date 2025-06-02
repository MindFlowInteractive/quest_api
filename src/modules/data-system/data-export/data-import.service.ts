import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, AuthProvider } from '../../../modules/auth/entities/user.entity';
import { Puzzle } from '../entities/puzzle.entity';
import { ExportFormat } from './dto/data-export.dto';
import * as fs from 'fs/promises';
import { parse } from 'csv-parse';
import * as xml2js from 'xml2js';
import { Readable } from 'stream';

export interface ImportResult {
  success: boolean;
  message: string;
  data: {
    errors: string[];
    warnings: string[];
    recordsProcessed: number;
    recordsImported: number;
  };
}

interface ImportedUser {
  email: string;
  name: string;
  phoneNumber?: string;
  preferences?: Record<string, unknown>;
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
      message: '',
      data: {
        errors: [],
        warnings: [],
        recordsProcessed: 0,
        recordsImported: 0,
      },
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let data: Record<string, unknown>;

      switch (format) {
        case ExportFormat.JSON:
          data = JSON.parse(content) as Record<string, unknown>;
          break;
        case ExportFormat.CSV:
          const csvUsers = await this.parseCSV(content);
          data = { users: csvUsers };
          break;
        case ExportFormat.XML:
          const xmlUsers = await this.parseXML(content);
          data = { users: xmlUsers };
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const validationResult = this.validateImportData(data);
      result.data.errors = validationResult.errors;
      result.data.warnings = validationResult.warnings;

      if (options.validateOnly) {
        result.success = validationResult.errors.length === 0;
        result.message = validationResult.errors.length === 0 ? 'Validation successful' : 'Validation failed';
        return result;
      }

      if (validationResult.errors.length > 0 && !options.skipErrors) {
        result.success = false;
        result.message = 'Validation failed';
        return result;
      }

      // Import user data
      if (data.user) {
        try {
          await this.importUser(
            data.user as Record<string, unknown>,
            options.userId,
          );
          result.data.recordsImported = 1;
        } catch (error) {
          const errorMsg =
            error instanceof Error
              ? `Failed to import user: ${error.message}`
              : `Failed to import user: ${String(error)}`;
          if (options.skipErrors) {
            result.data.warnings = [...(result.data.warnings || []), errorMsg];
          } else {
            result.data.errors = [...(result.data.errors || []), errorMsg];
          }
        }
        result.data.recordsProcessed = 1;
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
            result.data.recordsImported = (result.data.recordsImported || 0) + 1;
          } catch (error) {
            const errorMsg =
              error instanceof Error
                ? `Failed to import puzzle ${puzzleData.id}: ${error.message}`
                : `Failed to import puzzle ${puzzleData.id}: ${String(error)}`;
            if (options.skipErrors) {
              result.data.warnings = [...(result.data.warnings || []), errorMsg];
            } else {
              result.data.errors = [...(result.data.errors || []), errorMsg];
            }
          }
          result.data.recordsProcessed = (result.data.recordsProcessed || 0) + 1;
        }
      }

      result.success = result.data.errors.length === 0;
      result.message = result.success ? 'Import successful' : 'Import failed';
      return result;
    } catch (error) {
      this.logger.error('Import failed:', error);
      const errorMsg =
        error instanceof Error
          ? `Import failed: ${error.message}`
          : `Import failed: ${String(error)}`;
      result.data.errors = [errorMsg];
      result.success = false;
      result.message = 'Import failed';
      return result;
    }
  }

  private async parseCSV(content: string): Promise<ImportedUser[]> {
    return new Promise((resolve, reject) => {
      parse(content, { columns: true, skip_empty_lines: true }, (err: Error | undefined, records: any[]) => {
        if (err) return reject(err);
        resolve(records.map((record: Record<string, string>) => ({
          email: record.email,
          name: record.name,
          phoneNumber: record.phoneNumber,
          preferences: record.preferences ? JSON.parse(record.preferences) : undefined,
        })));
      });
    });
  }

  private async parseXML(content: string): Promise<ImportedUser[]> {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(content);
    const users = Array.isArray(result.users.user)
      ? result.users.user
      : [result.users.user];
    return users.map((user: Record<string, string>) => ({
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      preferences: user.preferences ? JSON.parse(user.preferences) : undefined,
    }));
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

      user.firstName = (userData.name as string) || user.firstName;
      user.phoneNumber = (userData.phoneNumber as string) || user.phoneNumber;
      user.preferences =
        (userData.preferences as Record<string, unknown>) || user.preferences;
    } else {
      user = this.userRepository.create({
        email: userData.email as string,
        username: (userData.email as string).split('@')[0], // Generate username from email
        password: 'changeme123!', // Default password that should be changed
        firstName: userData.name as string,
        lastName: '',
        role: UserRole.USER,
        provider: AuthProvider.LOCAL,
        isEmailVerified: true,
        isActive: true,
      });
    }

    return this.userRepository.save(user);
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

  async importUsers(file: Express.Multer.File): Promise<ImportResult> {
    try {
      const fileContent = file.buffer.toString();
      const fileType = file.mimetype;

      let users: ImportedUser[] = [];

      if (fileType === 'text/csv') {
        users = await this.parseCSV(fileContent);
      } else if (fileType === 'application/json') {
        users = JSON.parse(fileContent);
      } else if (fileType === 'application/xml') {
        users = await this.parseXML(fileContent);
      } else {
        throw new Error('Unsupported file type');
      }

      const result: ImportResult = {
        success: true,
        message: '',
        data: {
          errors: [],
          warnings: [],
          recordsProcessed: 0,
          recordsImported: 0,
        },
      };

      for (const userData of users) {
        result.data.recordsProcessed++;
        try {
          const existingUser = await this.userRepository.findOne({
            where: { email: userData.email },
          });

          if (existingUser) {
            existingUser.firstName = userData.name;
            existingUser.phoneNumber = userData.phoneNumber;
            existingUser.preferences = userData.preferences;
            await this.userRepository.save(existingUser);
          } else {
            const user = this.userRepository.create({
              email: userData.email,
              username: userData.email.split('@')[0],
              password: 'changeme123!',
              firstName: userData.name,
              lastName: '',
              role: UserRole.USER,
              provider: AuthProvider.LOCAL,
              isEmailVerified: true,
              isActive: true,
            });

            await this.userRepository.save(user);
          }
          result.data.recordsImported++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.data.errors.push(`Failed to import user ${userData.email}: ${errorMsg}`);
        }
      }

      result.success = result.data.errors.length === 0;
      result.message = result.success
        ? `Successfully imported ${result.data.recordsImported} users`
        : `Import completed with ${result.data.errors.length} errors`;

      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        data: {
          errors: [error instanceof Error ? error.message : String(error)],
          warnings: [],
          recordsProcessed: 0,
          recordsImported: 0,
        },
      };
    }
  }
}
