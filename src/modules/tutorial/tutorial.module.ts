import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Tutorial } from './entities/tutorial.entity';
import { User } from '../data-system/entities/user.entity';
import { TutorialStep } from './entities/tutorial-step.entity';
import { TutorialProgress } from './entities/utorial-progress.entity';
import { TutorialSession } from './entities/tutorial-session.entity';
import { TutorialAnalytics } from './entities/tutorial-analytics.entity';
import { TutorialContent } from './entities/tutorial-content.entity';
import { ContextualHelp } from './entities/contextual-help.entity';
import { TutorialController } from './controllers/tutorial.controller';
import { TutorialService } from './providers/tutorial.service';
import { TutorialProgressService } from './providers/tutorial-progress.service';
import { TutorialAnalyticsService } from './providers/tutorial-analytics.service';
import { TutorialEngineService } from './providers/tutorial-engine.service';
import { TutorialAdaptiveService } from './providers/tutorial-adaptive.service';
import { ContextualHelpService } from './providers/contextual-help.service';
import { TutorialLocalizationService } from './providers/tutorial-localization.service';
import { TutorialContentService } from './providers/tutorial-content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tutorial,
      TutorialStep,
      TutorialProgress,
      TutorialSession,
      TutorialAnalytics,
      TutorialContent,
      ContextualHelp,
      User,
      TutorialProgress
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [TutorialController],
  providers: [
    TutorialService,
    TutorialProgressService,
    TutorialAnalyticsService,
    TutorialEngineService,
    TutorialAdaptiveService,
    ContextualHelpService,
    TutorialLocalizationService,
    TutorialContentService,
  ],
  exports: [TutorialService,TutorialAnalyticsService, TutorialProgressService, TutorialEngineService, ContextualHelpService],
})
export class TutorialModule {}
