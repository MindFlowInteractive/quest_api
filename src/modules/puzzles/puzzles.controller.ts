import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PuzzlesService } from './puzzles.service';
import { CreatePuzzleDto } from './dto/create-puzzle.dto';
import { UpdatePuzzleDto } from './dto/update-puzzle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateLikeDto } from './dto/create-like.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreateProgressDto } from './dto/create-progress.dto';

@ApiTags('puzzles')
@Controller('puzzles')
export class PuzzlesController {
  constructor(private readonly puzzlesService: PuzzlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new puzzle' })
  @ApiResponse({ status: 201, description: 'Puzzle created successfully' })
  create(@Body() createPuzzleDto: CreatePuzzleDto, @Request() req) {
    return this.puzzlesService.create(createPuzzleDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all puzzles with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Return all puzzles' })
  findAll(@Query() query) {
    return this.puzzlesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a puzzle by id' })
  @ApiResponse({ status: 200, description: 'Return the puzzle' })
  @ApiResponse({ status: 404, description: 'Puzzle not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.puzzlesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a puzzle' })
  @ApiResponse({ status: 200, description: 'Puzzle updated successfully' })
  @ApiResponse({ status: 404, description: 'Puzzle not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePuzzleDto: UpdatePuzzleDto,
    @Request() req,
  ) {
    return this.puzzlesService.update(id, updatePuzzleDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a puzzle' })
  @ApiResponse({ status: 200, description: 'Puzzle deleted successfully' })
  @ApiResponse({ status: 404, description: 'Puzzle not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.puzzlesService.remove(id, req.user);
  }

  @Post(':id/rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a puzzle' })
  @ApiResponse({ status: 201, description: 'Rating submitted successfully' })
  ratePuzzle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rating: any,
    @Request() req,
  ) {
    return this.puzzlesService.ratePuzzle(id, req.user.id, rating);
  }

  @Post(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track puzzle analytics' })
  @ApiResponse({ status: 201, description: 'Analytics tracked successfully' })
  trackAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() analytics: any,
    @Request() req,
  ) {
    return this.puzzlesService.trackAnalytics(id, req.user.id, analytics);
  }

  @Get(':id/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export puzzle' })
  @ApiResponse({ status: 200, description: 'Puzzle exported successfully' })
  exportPuzzle(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string,
  ) {
    return this.puzzlesService.exportPuzzle(id, format);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import puzzle' })
  @ApiResponse({ status: 201, description: 'Puzzle imported successfully' })
  importPuzzle(@Body() data: any, @Request() req) {
    return this.puzzlesService.importPuzzle(data, req.user);
  }

  @Post(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a puzzle' })
  @ApiResponse({ status: 200, description: 'Puzzle moderated successfully' })
  moderatePuzzle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('approved') approved: boolean,
    @Request() req,
  ) {
    return this.puzzlesService.moderatePuzzle(id, req.user.id, approved);
  }

  // --- Review Endpoints ---
  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add or update a user's review" })
  addOrUpdateReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
    @Request() req,
  ) {
    return this.puzzlesService.addOrUpdateReview(id, req.user, dto);
  }

  @Delete(':id/reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  deleteReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Request() req,
  ) {
    return this.puzzlesService.deleteReview(id, reviewId, req.user);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'List all reviews for a puzzle' })
  getReviews(@Param('id', ParseUUIDPipe) id: string) {
    return this.puzzlesService.getReviews(id);
  }

  // --- Like Endpoints ---
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a puzzle' })
  likePuzzle(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.puzzlesService.likePuzzle(id, req.user);
  }

  // --- Comment Endpoints ---
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment' })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @Request() req,
  ) {
    return this.puzzlesService.addComment(id, req.user, dto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List comments' })
  getComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.puzzlesService.getComments(id);
  }

  // --- Feedback Endpoints ---
  @Post(':id/feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit feedback' })
  submitFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFeedbackDto,
    @Request() req,
  ) {
    return this.puzzlesService.submitFeedback(id, req.user, dto);
  }

  // --- Progression Endpoints ---
  @Post(':id/unlock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attempt to unlock puzzle' })
  unlockPuzzle(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.puzzlesService.unlockPuzzle(id, req.user);
  }

  @Get(':id/unlock-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can access puzzle' })
  getUnlockStatus(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.puzzlesService.getUnlockStatus(id, req.user);
  }

  // --- Progress Tracking ---
  @Get('/users/:userId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View user puzzle progress' })
  getUserProgress(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.puzzlesService.getUserProgress(userId);
  }
}
