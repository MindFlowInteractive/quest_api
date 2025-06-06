import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UsePipes,
  ValidationPipe,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PuzzleGenerationService } from '../services/puzzle-generation.service';
import { GenerationAnalyticsService } from '../services/generation-analytics.service';
import { ABTestingService } from '../services/ab-testing.service';
import { PuzzleConfig, GeneratedPuzzle } from '../interfaces/puzzle.interface';
import { GeneratePuzzleDto, AnalyticsQueryDto } from '../dto/puzzle-generation.dto';
import { PuzzleService } from '../services/PuzzleService';

@ApiTags('Puzzle Generation')
@Controller('puzzle-generation')
export class PuzzleGenerationController {
  private readonly logger = new Logger(PuzzleGenerationController.name);

  constructor(
    private puzzleGenerationService: PuzzleGenerationService,
    private analyticsService: GenerationAnalyticsService,
    private abTestingService: ABTestingService,
    private readonly puzzleService: PuzzleService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a single puzzle with optional A/B test config' })
  @ApiQuery({ name: 'userId', required: false, description: 'User identifier for A/B testing' })
  @ApiResponse({ status: 201, description: 'Puzzle generated successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generatePuzzle(@Body() generateDto: GeneratePuzzleDto, @Query('userId') userId?: string): Promise<GeneratedPuzzle> {
    try {
      let config: PuzzleConfig = {
        type: generateDto.type,
        difficulty: generateDto.difficulty,
        size: generateDto.size,
        constraints: generateDto.constraints,
        theme: generateDto.theme,
        timeLimit: generateDto.timeLimit,
      };

      if (userId) {
        config = await this.abTestingService.applyABTest(config, userId);
      }

      const puzzle = await this.puzzleGenerationService.generatePuzzle(config, userId);
      this.logger.log(`Generated ${config.type} puzzle with difficulty ${config.difficulty}`);
      return puzzle;
    } catch (error) {
      this.logger.error(`Failed to generate puzzle: ${error.message}`, error.stack);
      throw new HttpException('Failed to generate puzzle. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('batch-generate')
  @ApiOperation({ summary: 'Generate multiple puzzles in a batch' })
  @ApiQuery({ name: 'userId', required: false, description: 'User identifier for A/B testing' })
  @ApiResponse({ status: 201, description: 'Batch puzzle generation successful' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async batchGeneratePuzzles(@Body() configs: GeneratePuzzleDto[], @Query('userId') userId?: string): Promise<GeneratedPuzzle[]> {
    try {
      const puzzles = await Promise.all(
        configs.map(async (config) => {
          let puzzleConfig: PuzzleConfig = {
            type: config.type,
            difficulty: config.difficulty,
            size: config.size,
            constraints: config.constraints,
            theme: config.theme,
            timeLimit: config.timeLimit,
          };

          if (userId) {
            puzzleConfig = await this.abTestingService.applyABTest(puzzleConfig, userId);
          }

          return this.puzzleGenerationService.generatePuzzle(puzzleConfig, userId);
        }),
      );

      this.logger.log(`Batch generated ${puzzles.length} puzzles`);
      return puzzles;
    } catch (error) {
      this.logger.error(`Failed to batch generate puzzles: ${error.message}`, error.stack);
      throw new HttpException('Failed to generate puzzles batch. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics/success-rates')
  @ApiOperation({ summary: 'Get success rates for generated puzzles' })
  @ApiResponse({ status: 200, description: 'Success rates retrieved' })
  async getSuccessRates(@Query() query: AnalyticsQueryDto) {
    try {
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      return await this.analyticsService.getSuccessRates([startDate, endDate]);
    } catch (error) {
      this.logger.error(`Failed to get success rates: ${error.message}`);
      throw new HttpException('Failed to retrieve success rates', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get performance metrics for puzzles' })
  async getPerformanceMetrics() {
    try {
      return await this.analyticsService.getPerformanceMetrics();
    } catch (error) {
      this.logger.error(`Failed to get performance metrics: ${error.message}`);
      throw new HttpException('Failed to retrieve performance metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics/quality-trends')
  @ApiOperation({ summary: 'Get puzzle quality trends over time' })
  @ApiQuery({ name: 'days', required: false, example: '30', description: 'Number of days to look back' })
  async getQualityTrends(@Query('days') days: string = '30') {
    try {
      const dayCount = parseInt(days, 10);
      if (isNaN(dayCount) || dayCount < 1 || dayCount > 365) {
        throw new HttpException('Days must be between 1 and 365', HttpStatus.BAD_REQUEST);
      }

      return await this.analyticsService.getQualityTrends(dayCount);
    } catch (error) {
      this.logger.error(`Failed to get quality trends: ${error.message}`);
      throw new HttpException('Failed to retrieve quality trends', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('ab-tests')
  @ApiOperation({ summary: 'Get currently active A/B tests' })
  async getActiveABTests() {
    try {
      return await this.abTestingService.getActiveTests();
    } catch (error) {
      this.logger.error(`Failed to get A/B tests: ${error.message}`);
      throw new HttpException('Failed to retrieve A/B tests', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('ab-tests/:testName/result')
  @ApiOperation({ summary: 'Record result for an A/B test variant' })
  @ApiParam({ name: 'testName', description: 'Name of the A/B test' })
  async recordABTestResult(@Param('testName') testName: string, @Body() body: { userId: string; variant: string; outcome: any }) {
    try {
      await this.abTestingService.recordTestResult(testName, body.userId, body.variant, body.outcome);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to record A/B test result: ${error.message}`);
      throw new HttpException('Failed to record test result', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new puzzle layout' })
  async create(@Body() body: { title: string; layout: any; createdBy: string }) {
    return this.puzzleService.createPuzzle(body.title, body.layout, body.createdBy);
  }

  @Post(':id/components')
  @ApiOperation({ summary: 'Add a component to a puzzle' })
  @ApiParam({ name: 'id', description: 'Puzzle ID' })
  async addComponent(@Param('id') id: string, @Body() body: { type: string; config: any; position: string }) {
    return this.puzzleService.addComponent(+id, body.type, body.config, body.position);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate a puzzle layout' })
  @ApiParam({ name: 'id', description: 'Puzzle ID' })
  async validate(@Param('id') id: string) {
    return this.puzzleService.validatePuzzle(+id);
  }

  @Post(':id/version')
  @ApiOperation({ summary: 'Create a new version of a puzzle' })
  @ApiParam({ name: 'id', description: 'Puzzle ID' })
  async version(@Param('id') id: string, @Body() body: { changedBy: string }) {
    return this.puzzleService.createVersion(+id, body.changedBy);
  }
}
