import { Test, TestingModule } from '@nestjs/testing';
import { TutorialService } from './tutorial.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tutorial } from '../entities/tutorial.entity';
import { TutorialStep } from '../entities/tutorial-step.entity';
import { TutorialProgress } from '../entities/tutorial-progress.entity';
import { TutorialProgressService } from './tutorial-progress.service';

describe('TutorialService', () => {
  let service: TutorialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorialService,
        { provide: getRepositoryToken(Tutorial), useValue: {} },
        { provide: getRepositoryToken(TutorialStep), useValue: {} },
        { provide: getRepositoryToken(TutorialProgress), useValue: {} },
        { provide: TutorialProgressService, useValue: {} },
      ],
    }).compile();

    service = module.get<TutorialService>(TutorialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
