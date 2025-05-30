import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
      let data: any;

      switch (format) {
        case ExportFormat.JSON:
          data = JSON.parse(content);
          break;
        case ExportFormat.CSV:
          data = await this.parseCSV(content);
          break;
        case ExportFormat.XML:
          data = await this.parseXML(content);
          break;
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
          await this.importUser(data.user, options.userId);
          result.recordsImported++;
        } catch (error) {
          const errorMsg = `Failed to import user: ${error.message}`;
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
              puzzleData,
              options.userId || data.user?.id,
            );
            result.recordsImported++;
          } catch (error) {
            const errorMsg = `Failed to import puzzle ${puzzleData.id}: ${error.message}`;
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
      result.errors.push(`Import failed: ${error.message}`);
      return result;
    }
  }

  private async parseCSV(content: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from([content]);

      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          // Convert flat CSV structure back to nested structure
          const restructured = this.restructureFromCSV(results[0]);
          resolve(restructured);
        })
        .on('error', reject);
    });
  }

  private async parseXML(content: string): Promise<any> {
    const parser = new xml2js.Parser();
    return parser.parseStringPromise(content);
  }

  private restructureFromCSV(flatData: any): any {
    const data: any = {};

    for (const key in flatData) {
      const keys = key.split('_');
      let current = data;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      let value = flatData[key];

      // Try to parse JSON strings
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

  private validateImportData(data: any): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('Import data is empty or invalid');
      return { errors, warnings };
    }

    // Validate user data
    if (data.user) {
      if (!data.user.email) {
        errors.push('User email is required');
      }
      if (!data.user.name) {
        errors.push('User name is required');
      }
      if (data.user.email && !/\S+@\S+\.\S+/.test(data.user.email)) {
        errors.push('Invalid email format');
      }
    }

    // Validate puzzles data
    if (data.puzzles && Array.isArray(data.puzzles)) {
      data.puzzles.forEach((puzzle: any, index: number) => {
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
    userData: any,
    targetUserId?: string,
  ): Promise<User> {
    let user: User;

    if (targetUserId) {
      // Update existing user
      user = await this.userRepository.findOne({ where: { id: targetUserId } });
      if (!user) {
        throw new Error('Target user not found');
      }

      // Update user properties
      user.name = userData.name || user.name;
      user.phoneNumber = userData.phoneNumber || user.phoneNumber;
      user.preferences = userData.preferences || user.preferences;
    } else {
      // Create new user or find existing by email
      user = await this.userRepository.findOne({
        where: { email: userData.email },
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

    return this.userRepository.save(user);
  }

  private async importPuzzle(puzzleData: any, userId: string): Promise<Puzzle> {
    if (!userId) {
      throw new Error('User ID is required for puzzle import');
    }

    // Check if puzzle already exists
    let puzzle = await this.puzzleRepository.findOne({
      where: { id: puzzleData.id },
    });

    if (puzzle) {
      // Update existing puzzle
      puzzle.title = puzzleData.title || puzzle.title;
      puzzle.description = puzzleData.description || puzzle.description;
      puzzle.solution = puzzleData.solution || puzzle.solution;
      puzzle.difficulty = puzzleData.difficulty || puzzle.difficulty;
      puzzle.metadata = puzzleData.metadata || puzzle.metadata;
      puzzle.isActive =
        puzzleData.isActive !== undefined
          ? puzzleData.isActive
          : puzzle.isActive;
    } else {
      // Create new puzzle
      puzzle = this.puzzleRepository.create({
        title: puzzleData.title,
        description: puzzleData.description,
        solution: puzzleData.solution || 'No solution provided',
        difficulty: puzzleData.difficulty || 'easy',
        metadata: puzzleData.metadata,
        isActive:
          puzzleData.isActive !== undefined ? puzzleData.isActive : true,
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
