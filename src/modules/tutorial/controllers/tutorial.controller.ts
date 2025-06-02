import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { TutorialService } from '../providers/tutorial.service';
import { TutorialProgressService } from '../providers/tutorial-progress.service';
import { TutorialAnalyticsService } from '../providers/tutorial-analytics.service';
import { TutorialEngineService } from '../providers/tutorial-engine.service';
import { TutorialAdaptiveService } from '../providers/tutorial-adaptive.service';
import { ContextualHelpService } from '../providers/contextual-help.service';
import { TutorialLocalizationService } from '../providers/tutorial-localization.service';
import { TutorialContentService } from '../providers/tutorial-content.service';
import {
  CreateContextualHelpDto,
  CreateTutorialDto,
  CreateTutorialStepDto,
  StartTutorialDto,
  StepInteractionDto,
  SubmitFeedbackDto,
  TutorialSearchDto,
  UpdateProgressDto,
} from '../dto/create-tutorial.dto';

@ApiTags('tutorials')
@Controller('tutorials')
export class TutorialController {
  constructor(
    private readonly tutorialService: TutorialService,
    private readonly progressService: TutorialProgressService,
    private readonly analyticsService: TutorialAnalyticsService,
    private readonly engineService: TutorialEngineService,
    private readonly adaptiveService: TutorialAdaptiveService,
    private readonly contextualHelpService: ContextualHelpService,
    private readonly localizationService: TutorialLocalizationService,
    private readonly contentService: TutorialContentService,
  ) {}

  // Tutorial Management Endpoints

  @Post()
  @ApiOperation({ summary: 'Create a new tutorial' })
  @ApiResponse({ status: 201, description: 'Tutorial created successfully' })
  async createTutorial(@Body() createDto: CreateTutorialDto) {
    const tutorial = await this.tutorialService.createTutorial(createDto);

    return {
      success: true,
      message: 'Tutorial created successfully',
      data: tutorial,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Search and list tutorials' })
  @ApiResponse({ status: 200, description: 'Tutorials retrieved successfully' })
  async searchTutorials(@Query() searchDto: TutorialSearchDto) {
    const result = await this.tutorialService.searchTutorials(searchDto);

    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tutorial by ID' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial retrieved successfully' })
  async getTutorial(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';
    const { tutorial, progress } =
      await this.tutorialService.getTutorialWithProgress(id, userId);

    return {
      success: true,
      data: {
        tutorial,
        progress,
      },
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial updated successfully' })
  async updateTutorial(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateTutorialDto>,
  ) {
    const tutorial = await this.tutorialService.updateTutorial(id, updateDto);

    return {
      success: true,
      message: 'Tutorial updated successfully',
      data: tutorial,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial deleted successfully' })
  async deleteTutorial(@Param('id') id: string) {
    await this.tutorialService.deleteTutorial(id);

    return {
      success: true,
      message: 'Tutorial deleted successfully',
    };
  }

  // Tutorial Steps Management

  @Post(':id/steps')
  @ApiOperation({ summary: 'Add step to tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 201, description: 'Step added successfully' })
  async addStepToTutorial(
    @Param('id') tutorialId: string,
    @Body() stepDto: CreateTutorialStepDto,
  ) {
    const step = await this.tutorialService.addStepToTutorial(
      tutorialId,
      stepDto,
    );

    return {
      success: true,
      message: 'Step added successfully',
      data: step,
    };
  }

  // Tutorial Progress and Interaction

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial started successfully' })
  async startTutorial(
    @Param('id') tutorialId: string,
    @Body() startDto: StartTutorialDto,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    // Check prerequisites
    const { canStart, missingPrerequisites } =
      await this.tutorialService.checkPrerequisites(tutorialId, userId);

    if (!canStart) {
      throw new BadRequestException({
        message: 'Prerequisites not met',
        missingPrerequisites: missingPrerequisites.map((t) => ({
          id: t.id,
          title: t.title,
        })),
      });
    }

    const { progress, session } = await this.progressService.startTutorial(
      userId,
      tutorialId,
      startDto.deviceInfo,
    );

    const tutorialState = await this.engineService.getCurrentTutorialState(
      userId,
      tutorialId,
    );

    return {
      success: true,
      message: 'Tutorial started successfully',
      data: {
        progress,
        session,
        currentState: tutorialState,
      },
    };
  }

  @Post(':id/interact')
  @ApiOperation({ summary: 'Process step interaction' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({
    status: 200,
    description: 'Interaction processed successfully',
  })
  async processInteraction(
    @Param('id') tutorialId: string,
    @Body() interactionDto: StepInteractionDto,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const result = await this.engineService.processStepInteraction(
      userId,
      tutorialId,
      interactionDto,
    );

    // Get updated tutorial state
    const tutorialState = await this.engineService.getCurrentTutorialState(
      userId,
      tutorialId,
    );

    return {
      success: true,
      data: {
        interactionResult: result,
        currentState: tutorialState,
      },
    };
  }

  @Post(':id/hint')
  @ApiOperation({ summary: 'Get hint for current step' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiQuery({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Hint provided successfully' })
  async getHint(
    @Param('id') tutorialId: string,
    @Query('stepId') stepId: string,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const hintResult = await this.engineService.provideHint(
      userId,
      tutorialId,
      stepId,
    );

    return {
      success: true,
      data: hintResult,
    };
  }

  @Post(':id/skip')
  @ApiOperation({ summary: 'Skip current step' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiQuery({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Step skipped successfully' })
  async skipStep(
    @Param('id') tutorialId: string,
    @Query('stepId') stepId: string,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const result = await this.engineService.skipStep(
      userId,
      tutorialId,
      stepId,
    );

    return {
      success: true,
      message: 'Step skipped successfully',
      data: result,
    };
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial paused successfully' })
  async pauseTutorial(@Param('id') tutorialId: string, @Req() req: Request) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const progress = await this.progressService.pauseTutorial(
      userId,
      tutorialId,
    );

    return {
      success: true,
      message: 'Tutorial paused successfully',
      data: progress,
    };
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial resumed successfully' })
  async resumeTutorial(@Param('id') tutorialId: string, @Req() req: Request) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const progress = await this.progressService.resumeTutorial(
      userId,
      tutorialId,
    );
    const tutorialState = await this.engineService.getCurrentTutorialState(
      userId,
      tutorialId,
    );

    return {
      success: true,
      message: 'Tutorial resumed successfully',
      data: {
        progress,
        currentState: tutorialState,
      },
    };
  }

  @Post(':id/skip-tutorial')
  @ApiOperation({ summary: 'Skip entire tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial skipped successfully' })
  async skipTutorial(@Param('id') tutorialId: string, @Req() req: Request) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const progress = await this.progressService.skipTutorial(
      userId,
      tutorialId,
    );

    return {
      success: true,
      message: 'Tutorial skipped successfully',
      data: progress,
    };
  }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Restart tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Tutorial restarted successfully' })
  async restartTutorial(@Param('id') tutorialId: string, @Req() req: Request) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    await this.engineService.restartTutorial(userId, tutorialId);

    return {
      success: true,
      message: 'Tutorial restarted successfully',
    };
  }

  // Progress Management

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get tutorial progress' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getTutorialProgress(
    @Param('id') tutorialId: string,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const progress = await this.progressService.getUserProgress(
      userId,
      tutorialId,
    );

    if (!progress) {
      throw new NotFoundException('Tutorial progress not found');
    }

    return {
      success: true,
      data: progress,
    };
  }

  @Put(':id/progress')
  @ApiOperation({ summary: 'Update tutorial progress' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  async updateTutorialProgress(
    @Param('id') tutorialId: string,
    @Body() updateDto: UpdateProgressDto,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const progress = await this.progressService.updateProgress(
      userId,
      tutorialId,
      updateDto,
    );

    return {
      success: true,
      message: 'Progress updated successfully',
      data: progress,
    };
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit tutorial feedback' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Feedback submitted successfully' })
  async submitFeedback(
    @Param('id') tutorialId: string,
    @Body() feedbackDto: SubmitFeedbackDto,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const progress = await this.progressService.submitFeedback(
      userId,
      tutorialId,
      feedbackDto,
    );

    return {
      success: true,
      message: 'Feedback submitted successfully',
      data: progress,
    };
  }

  // Bookmarks

  @Post(':id/bookmark')
  @ApiOperation({ summary: 'Add bookmark to step' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiQuery({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Bookmark added successfully' })
  async addBookmark(
    @Param('id') tutorialId: string,
    @Query('stepId') stepId: string,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    await this.progressService.addBookmark(userId, tutorialId, stepId);

    return {
      success: true,
      message: 'Bookmark added successfully',
    };
  }

  @Delete(':id/bookmark')
  @ApiOperation({ summary: 'Remove bookmark from step' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiQuery({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Bookmark removed successfully' })
  async removeBookmark(
    @Param('id') tutorialId: string,
    @Query('stepId') stepId: string,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    await this.progressService.removeBookmark(userId, tutorialId, stepId);

    return {
      success: true,
      message: 'Bookmark removed successfully',
    };
  }

  // User Progress Overview

  @Get('user/progress')
  @ApiOperation({ summary: "Get user's tutorial progress overview" })
  @ApiResponse({
    status: 200,
    description: 'User progress retrieved successfully',
  })
  async getUserProgress(@Req() req: Request) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const progressList = await this.progressService.getUserProgressList(userId);
    const stats = await this.progressService.getProgressStats(userId);

    return {
      success: true,
      data: {
        progressList,
        stats,
      },
    };
  }

  // Recommendations

  @Get('recommendations')
  @ApiOperation({ summary: 'Get recommended tutorials' })
  @ApiQuery({ name: 'maxRecommendations', required: false })
  @ApiQuery({ name: 'includeCompleted', required: false })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
  })
  async getRecommendations(
    @Query('maxRecommendations') maxRecommendations?: number,
    @Query('includeCompleted') includeCompleted?: boolean,
    @Req() req?: Request,
  ) {
    const userId = (req?.headers['user-id'] as string) || 'mock-user-id';

    const recommendations = await this.tutorialService.getRecommendedTutorials(
      userId,
      maxRecommendations || 5,
      includeCompleted || false,
    );

    return {
      success: true,
      data: recommendations,
    };
  }

  // Analytics and Reporting

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get tutorial analytics' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getTutorialAnalytics(@Param('id') tutorialId: string) {
    const stats = await this.tutorialService.getTutorialStats(tutorialId);
    const effectiveness =
      await this.analyticsService.getTutorialEffectiveness(tutorialId);

    return {
      success: true,
      data: {
        stats,
        effectiveness,
      },
    };
  }

  @Get('analytics/report')
  @ApiOperation({ summary: 'Get analytics report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'tutorialId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Analytics report retrieved successfully',
  })
  async getAnalyticsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tutorialId') tutorialId?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const report = await this.analyticsService.getAnalyticsReport(
      start,
      end,
      tutorialId,
    );

    return {
      success: true,
      data: report,
    };
  }

  @Get('user/learning-pattern')
  @ApiOperation({ summary: 'Get user learning pattern' })
  @ApiResponse({
    status: 200,
    description: 'Learning pattern retrieved successfully',
  })
  async getUserLearningPattern(@Req() req: Request) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const pattern = await this.analyticsService.getUserLearningPattern(userId);

    return {
      success: true,
      data: pattern,
    };
  }

  // Adaptive Learning

  @Get(':id/adaptive-settings')
  @ApiOperation({ summary: 'Get adaptive settings for tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({
    status: 200,
    description: 'Adaptive settings retrieved successfully',
  })
  async getAdaptiveSettings(
    @Param('id') tutorialId: string,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const settings = await this.adaptiveService.getUserAdaptiveSettings(
      userId,
      tutorialId,
    );

    return {
      success: true,
      data: settings,
    };
  }

  @Get(':id/personalized-content')
  @ApiOperation({ summary: 'Get personalized content for step' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiQuery({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({
    status: 200,
    description: 'Personalized content retrieved successfully',
  })
  async getPersonalizedContent(
    @Param('id') tutorialId: string,
    @Query('stepId') stepId: string,
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const content = await this.adaptiveService.generatePersonalizedContent(
      userId,
      tutorialId,
      stepId,
    );

    return {
      success: true,
      data: content,
    };
  }

  // Contextual Help

  @Post('help')
  @ApiOperation({ summary: 'Create contextual help' })
  @ApiResponse({
    status: 201,
    description: 'Contextual help created successfully',
  })
  async createContextualHelp(@Body() createDto: CreateContextualHelpDto) {
    const help =
      await this.contextualHelpService.createContextualHelp(createDto);

    return {
      success: true,
      message: 'Contextual help created successfully',
      data: help,
    };
  }

  @Get('help/:context')
  @ApiOperation({ summary: 'Get contextual help for game context' })
  @ApiParam({ name: 'context', description: 'Game context' })
  @ApiQuery({ name: 'language', required: false })
  @ApiResponse({
    status: 200,
    description: 'Contextual help retrieved successfully',
  })
  async getContextualHelp(
    @Param('context') gameContext: string,
    @Query('language') language = 'en',
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    // Mock user context - in real implementation, this would come from game state
    const userContext = {
      gameState: {},
      userLevel: 'beginner',
      completedTutorials: [],
      currentScreen: gameContext,
      timeInGame: 0,
    };

    const help = await this.contextualHelpService.getContextualHelp(
      gameContext,
      userContext,
      language,
    );

    return {
      success: true,
      data: help,
    };
  }

  @Get('help/smart/:strugglingArea')
  @ApiOperation({ summary: 'Get smart help for struggling area' })
  @ApiParam({
    name: 'strugglingArea',
    description: 'Area where user is struggling',
  })
  @ApiQuery({ name: 'language', required: false })
  @ApiResponse({
    status: 200,
    description: 'Smart help retrieved successfully',
  })
  async getSmartHelp(
    @Param('strugglingArea') strugglingArea: string,
    @Query('language') language = 'en',
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const userContext = {
      gameState: {},
      userLevel: 'beginner',
      completedTutorials: [],
      currentScreen: strugglingArea,
      timeInGame: 0,
    };

    const help = await this.contextualHelpService.getSmartHelp(
      userContext,
      strugglingArea,
      language,
    );

    return {
      success: true,
      data: help,
    };
  }

  @Post('help/:helpId/interaction')
  @ApiOperation({ summary: 'Record help interaction' })
  @ApiParam({ name: 'helpId', description: 'Help ID' })
  @ApiResponse({
    status: 200,
    description: 'Interaction recorded successfully',
  })
  async recordHelpInteraction(
    @Param('helpId') helpId: string,
    @Body()
    body: { interactionType: 'view' | 'click' | 'dismiss'; viewTime?: number },
    @Req() req: Request,
  ) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    await this.contextualHelpService.recordHelpInteraction(
      helpId,
      userId,
      body.interactionType,
      body.viewTime,
    );

    return {
      success: true,
      message: 'Interaction recorded successfully',
    };
  }

  // Localization

  @Get(':id/content/:stepId')
  @ApiOperation({ summary: 'Get localized content for step' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiQuery({ name: 'language', required: false })
  @ApiResponse({
    status: 200,
    description: 'Localized content retrieved successfully',
  })
  async getLocalizedContent(
    @Param('id') tutorialId: string,
    @Param('stepId') stepId: string,
    @Query('language') language = 'en',
  ) {
    const content = await this.localizationService.getLocalizedContent(
      tutorialId,
      stepId,
      language,
    );

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return {
      success: true,
      data: content,
    };
  }

  @Get(':id/languages')
  @ApiOperation({ summary: 'Get available languages for tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({
    status: 200,
    description: 'Available languages retrieved successfully',
  })
  async getAvailableLanguages(@Param('id') tutorialId: string) {
    const languages =
      await this.localizationService.getAvailableLanguages(tutorialId);

    return {
      success: true,
      data: languages,
    };
  }

  @Get(':id/translation-progress')
  @ApiOperation({ summary: 'Get translation progress for tutorial' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({
    status: 200,
    description: 'Translation progress retrieved successfully',
  })
  async getTranslationProgress(@Param('id') tutorialId: string) {
    const progress =
      await this.localizationService.getTranslationProgress(tutorialId);

    return {
      success: true,
      data: progress,
    };
  }

  // Content Management

  @Post(':id/content')
  @ApiOperation({ summary: 'Create tutorial content' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({ status: 201, description: 'Content created successfully' })
  async createContent(
    @Param('id') tutorialId: string,
    @Body()
    contentData: {
      stepId: string;
      title: string;
      content: string;
      contentType: string;
      language?: string;
    },
  ) {
    const content = await this.contentService.createContent(
      tutorialId,
      contentData.stepId,
      {
        title: contentData.title,
        content: contentData.content,
        contentType: contentData.contentType as any,
        language: contentData.language,
      },
    );

    return {
      success: true,
      message: 'Content created successfully',
      data: content,
    };
  }

  @Post('content/:contentId/validate')
  @ApiOperation({ summary: 'Validate tutorial content' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content validation completed' })
  async validateContent(@Param('contentId') contentId: string) {
    const validation = await this.contentService.validateContent(contentId);

    return {
      success: true,
      data: validation,
    };
  }

  @Post('content/:contentId/publish')
  @ApiOperation({ summary: 'Publish tutorial content' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content published successfully' })
  async publishContent(@Param('contentId') contentId: string) {
    const content = await this.contentService.publishContent(contentId);

    return {
      success: true,
      message: 'Content published successfully',
      data: content,
    };
  }

  // Utility Endpoints

  @Get('categories')
  @ApiOperation({ summary: 'Get tutorial categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getCategories() {
    // Return available tutorial categories
    return {
      success: true,
      data: {
        categories: [
          'onboarding',
          'puzzle_mechanics',
          'advanced_strategies',
          'game_features',
          'accessibility',
        ],
        difficulties: ['beginner', 'intermediate', 'advanced', 'expert'],
        types: ['basic', 'intermediate', 'advanced', 'specialized'],
      },
    };
  }

  @Get('prerequisites/:id')
  @ApiOperation({ summary: 'Get tutorial prerequisites' })
  @ApiParam({ name: 'id', description: 'Tutorial ID' })
  @ApiResponse({
    status: 200,
    description: 'Prerequisites retrieved successfully',
  })
  async getPrerequisites(@Param('id') tutorialId: string, @Req() req: Request) {
    const userId = (req.headers['user-id'] as string) || 'mock-user-id';

    const prerequisites =
      await this.tutorialService.getPrerequisites(tutorialId);
    const { canStart, missingPrerequisites } =
      await this.tutorialService.checkPrerequisites(tutorialId, userId);

    return {
      success: true,
      data: {
        prerequisites,
        canStart,
        missingPrerequisites,
      },
    };
  }

  @Get('help/popular')
  @ApiOperation({ summary: 'Get popular help topics' })
  @ApiQuery({ name: 'gameContext', required: false })
  @ApiResponse({
    status: 200,
    description: 'Popular help topics retrieved successfully',
  })
  async getPopularHelpTopics(@Query('gameContext') gameContext?: string) {
    const topics =
      await this.contextualHelpService.getPopularHelpTopics(gameContext);

    return {
      success: true,
      data: topics,
    };
  }

  @Get('help/:helpId/analytics')
  @ApiOperation({ summary: 'Get help analytics' })
  @ApiParam({ name: 'helpId', description: 'Help ID' })
  @ApiResponse({
    status: 200,
    description: 'Help analytics retrieved successfully',
  })
  async getHelpAnalytics(@Param('helpId') helpId: string) {
    const analytics = await this.contextualHelpService.getHelpAnalytics(helpId);

    return {
      success: true,
      data: analytics,
    };
  }
}
