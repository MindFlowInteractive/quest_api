import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PuzzleService } from './puzzle.service';
import { AntiCheatDetectionService } from '../modules/anti-cheat/services/anti-cheat-detection.service';
import {
  PuzzleStateDto,
  CreatePuzzleDto,
  MovePuzzleDto,
  GetHintDto,
  UpdatePlayerMetricsDto,
} from './dto/create-puzzle.dto';
import {
  PuzzleHintResponseDto,
  PuzzleResultResponseDto,
  UndoRedoResponseDto,
} from './dto/respones-puzzle.dto';

@ApiTags('puzzles')
@Controller('puzzles')
export class PuzzleController {
  private readonly logger = new Logger(PuzzleController.name);

  constructor(
    private readonly puzzleService: PuzzleService,
    private readonly antiCheatService: AntiCheatDetectionService,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new puzzle' })
  @ApiResponse({
    status: 201,
    description: 'Puzzle created successfully',
    type: PuzzleStateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid puzzle type or difficulty',
  })
  async createPuzzle(
    @Body() createPuzzleDto: CreatePuzzleDto,
  ): Promise<PuzzleStateDto> {
    try {
      this.logger.log(
        `Creating puzzle: ${createPuzzleDto.type}, difficulty: ${createPuzzleDto.difficulty}`,
      );

      const puzzle = await this.puzzleService.createPuzzle(
        createPuzzleDto.type,
        createPuzzleDto.difficulty,
        createPuzzleDto.playerId,
      );

      return puzzle;
    } catch (error) {
      this.logger.error(`Failed to create puzzle: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to create puzzle',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':puzzleId/move')
  @ApiOperation({ summary: 'Make a move in the puzzle' })
  @ApiParam({ name: 'puzzleId', description: 'Unique puzzle identifier' })
  @ApiResponse({
    status: 200,
    description: 'Move executed successfully',
    type: PuzzleStateDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid move' })
  @ApiResponse({ status: 404, description: 'Puzzle not found' })
  async makeMove(
    @Param('puzzleId') puzzleId: string,
    @Body() movePuzzleDto: MovePuzzleDto,
    @Body('currentState') currentState: PuzzleStateDto,
    @Body('moveMetadata') moveMetadata?: any, // Additional metadata for anti-cheat validation
  ): Promise<PuzzleStateDto> {
    try {
      this.logger.log(
        `Making move in puzzle ${puzzleId}: ${movePuzzleDto.type}`,
      );

      // Perform basic anti-cheat validation on move timing and sequence
      if (moveMetadata) {
        const isValidMove = await this.antiCheatService.validateMove({
          puzzleId,
          puzzleType: currentState.data?.type || 'unknown',
          move: movePuzzleDto,
          currentState,
          moveMetadata,
        });

        if (!isValidMove.isValid) {
          this.logger.warn(
            `Suspicious move detected for puzzle ${puzzleId}: ${isValidMove.reasons.join(', ')}`,
          );
          // For moves, we log but don't block unless confidence is very high
          if (isValidMove.confidence > 0.9) {
            throw new HttpException(
              'Move validation failed',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      }

      const move = {
        ...movePuzzleDto,
        timestamp: new Date(),
      };

      const newState = await this.puzzleService.makeMove(
        puzzleId,
        move,
        currentState,
      );
      return newState;
    } catch (error) {
      this.logger.error(
        `Failed to make move in puzzle ${puzzleId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to execute move',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':puzzleId/hint')
  @ApiOperation({ summary: 'Get a hint for the puzzle' })
  @ApiParam({ name: 'puzzleId', description: 'Unique puzzle identifier' })
  @ApiResponse({
    status: 200,
    description: 'Hint generated successfully',
    type: PuzzleHintResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Puzzle not found' })
  async getHint(
    @Param('puzzleId') puzzleId: string,
    @Query() getHintDto: GetHintDto,
    @Body('currentState') currentState: PuzzleStateDto,
  ): Promise<PuzzleHintResponseDto> {
    try {
      this.logger.log(
        `Getting hint for puzzle ${puzzleId}, level: ${getHintDto.level}`,
      );

      const hint = await this.puzzleService.getHint(
        currentState,
        getHintDto.level,
      );
      return hint;
    } catch (error) {
      this.logger.error(
        `Failed to get hint for puzzle ${puzzleId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to generate hint',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':puzzleId/check-solution')
  @ApiOperation({ summary: 'Check if puzzle is solved and calculate score' })
  @ApiParam({ name: 'puzzleId', description: 'Unique puzzle identifier' })
  @ApiResponse({
    status: 200,
    description: 'Solution checked successfully',
    type: PuzzleResultResponseDto,
  })
  async checkSolution(
    @Param('puzzleId') puzzleId: string,
    @Body('currentState') currentState: PuzzleStateDto,
    @Body('solutionData') solutionData?: any, // Additional data for anti-cheat validation
  ): Promise<PuzzleResultResponseDto> {
    try {
      this.logger.log(`Checking solution for puzzle ${puzzleId}`);

      // First, perform anti-cheat validation if solution data is provided
      if (solutionData) {
        const antiCheatResult = await this.antiCheatService.validatePuzzleSolution({
          puzzleId,
          puzzleType: currentState.data?.type || 'unknown',
          moves: solutionData.moves || [],
          solutionTime: solutionData.solutionTime || 0,
          startTime: solutionData.startTime || Date.now(),
          endTime: solutionData.endTime || Date.now(),
          deviceInfo: solutionData.deviceInfo,
          browserInfo: solutionData.browserInfo,
          userId: solutionData.userId || 'anonymous',
        });

        // If cheating is detected with high confidence, reject the solution
        if (antiCheatResult.cheatDetected && antiCheatResult.confidence > 0.8) {
          this.logger.warn(
            `Cheating detected for puzzle ${puzzleId}: ${antiCheatResult.reasons.join(', ')}`,
          );
          throw new HttpException(
            'Solution validation failed due to suspicious activity',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const result = await this.puzzleService.checkSolution(currentState);

      if (result.solved) {
        this.logger.log(
          `Puzzle ${puzzleId} solved! Score: ${result.totalScore}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to check solution for puzzle ${puzzleId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to check solution',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':puzzleId/undo')
  @ApiOperation({ summary: 'Undo last move' })
  @ApiParam({ name: 'puzzleId', description: 'Unique puzzle identifier' })
  @ApiResponse({
    status: 200,
    description: 'Undo operation result',
    type: UndoRedoResponseDto,
  })
  async undoMove(
    @Param('puzzleId') puzzleId: string,
  ): Promise<UndoRedoResponseDto> {
    try {
      this.logger.log(`Undoing move for puzzle ${puzzleId}`);

      const previousState = await this.puzzleService.undo(puzzleId);

      if (previousState) {
        return {
          success: true,
          state: previousState,
        };
      } else {
        return {
          success: false,
          message: 'No moves to undo',
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to undo move for puzzle ${puzzleId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to undo move',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':puzzleId/redo')
  @ApiOperation({ summary: 'Redo previously undone move' })
  @ApiParam({ name: 'puzzleId', description: 'Unique puzzle identifier' })
  @ApiResponse({
    status: 200,
    description: 'Redo operation result',
    type: UndoRedoResponseDto,
  })
  async redoMove(
    @Param('puzzleId') puzzleId: string,
  ): Promise<UndoRedoResponseDto> {
    try {
      this.logger.log(`Redoing move for puzzle ${puzzleId}`);

      const nextState = await this.puzzleService.redo(puzzleId);

      if (nextState) {
        return {
          success: true,
          state: nextState,
        };
      } else {
        return {
          success: false,
          message: 'No moves to redo',
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to redo move for puzzle ${puzzleId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to redo move',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':puzzleId/pause')
  @ApiOperation({ summary: 'Pause puzzle timer' })
  @ApiParam({ name: 'puzzleId', description: 'Unique puzzle identifier' })
  @ApiResponse({ status: 200, description: 'Timer paused successfully' })
  async pauseGame(
    @Param('puzzleId') puzzleId: string,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Pausing game for puzzle ${puzzleId}`);

      await this.puzzleService.pauseGame(puzzleId);

      return { message: 'Game paused successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to pause game for puzzle ${puzzleId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to pause game',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':puzzleId/resume')
  @ApiOperation({ summary: 'Resume puzzle timer' })
  @ApiParam({ name: 'puzzleId', description: 'Unique puzzle identifier' })
  @ApiResponse({ status: 200, description: 'Timer resumed successfully' })
  async resumeGame(
    @Param('puzzleId') puzzleId: string,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Resuming game for puzzle ${puzzleId}`);

      await this.puzzleService.resumeGame(puzzleId);

      return { message: 'Game resumed successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to resume game for puzzle ${puzzleId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to resume game',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('players/:playerId/metrics')
  @ApiOperation({
    summary: 'Update player performance metrics for difficulty adjustment',
  })
  @ApiParam({ name: 'playerId', description: 'Unique player identifier' })
  @ApiResponse({ status: 200, description: 'Metrics updated successfully' })
  async updatePlayerMetrics(
    @Param('playerId') playerId: string,
    @Body() updateMetricsDto: UpdatePlayerMetricsDto,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Updating metrics for player ${playerId}`);

      // Get the puzzle engine through the service
      const engine = this.puzzleService.getEngine();
      engine.updatePlayerMetrics(playerId, updateMetricsDto);

      return { message: 'Player metrics updated successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to update metrics for player ${playerId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to update player metrics',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':puzzleId/status')
  @ApiOperation({
    summary: 'Get puzzle status including undo/redo availability',
  })
  @ApiParam({ name: 'puzzleId', description: 'Unique puzzle identifier' })
  @ApiResponse({
    status: 200,
    description: 'Puzzle status retrieved successfully',
  })
  async getPuzzleStatus(@Param('puzzleId') puzzleId: string): Promise<{
    canUndo: boolean;
    canRedo: boolean;
    puzzleId: string;
  }> {
    try {
      const engine = this.puzzleService.getEngine();

      const canUndo = engine.canUndo(puzzleId);
      const canRedo = engine.canRedo(puzzleId);

      return {
        puzzleId,
        canUndo,
        canRedo,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get status for puzzle ${puzzleId}: ${error.message}`,
      );
      throw new HttpException(
        error.message || 'Failed to get puzzle status',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available puzzle types' })
  @ApiResponse({ status: 200, description: 'Available puzzle types' })
  async getAvailablePuzzleTypes(): Promise<{ types: string[] }> {
    // This would typically come from a configuration or database
    return {
      types: ['sliding-puzzle', 'sudoku', 'word-search', 'jigsaw', 'maze'],
    };
  }
}
