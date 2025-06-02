import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { Puzzle, PuzzleStatus } from './entities/puzzle.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { PuzzleVersion } from './entities/puzzle-version.entity';
import { PuzzleAnalytics } from './entities/puzzle-analytics.entity';
import { PuzzleRating } from './entities/puzzle-rating.entity';
import { CreatePuzzleDto } from './dto/create-puzzle.dto';
import { UpdatePuzzleDto } from './dto/update-puzzle.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class PuzzlesService {
  constructor(
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(PuzzleVersion)
    private versionRepository: Repository<PuzzleVersion>,
    @InjectRepository(PuzzleAnalytics)
    private analyticsRepository: Repository<PuzzleAnalytics>,
    @InjectRepository(PuzzleRating)
    private ratingRepository: Repository<PuzzleRating>,
  ) {}

  async create(createPuzzleDto: CreatePuzzleDto, user: User): Promise<Puzzle> {
    const puzzle = this.puzzleRepository.create({
      ...createPuzzleDto,
      creator: user,
    });

    if (createPuzzleDto.categoryIds) {
      puzzle.categories = await this.categoryRepository.findBy({
        id: In(createPuzzleDto.categoryIds),
      });
    }

    if (createPuzzleDto.tagIds) {
      puzzle.tags = await this.tagRepository.findBy({
        id: In(createPuzzleDto.tagIds),
      });
    }

    const savedPuzzle = await this.puzzleRepository.save(puzzle);

    // Create initial version
    await this.createVersion(savedPuzzle, user, 'Initial version');

    return savedPuzzle;
  }

  async findAll(query: {
    status?: PuzzleStatus;
    difficulty?: string;
    categoryIds?: string[];
    tagIds?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Puzzle[]; total: number }> {
    const {
      status,
      difficulty,
      categoryIds,
      tagIds,
      search,
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.puzzleRepository
      .createQueryBuilder('puzzle')
      .leftJoinAndSelect('puzzle.categories', 'category')
      .leftJoinAndSelect('puzzle.tags', 'tag')
      .leftJoinAndSelect('puzzle.creator', 'creator');

    if (status) {
      queryBuilder.andWhere('puzzle.status = :status', { status });
    }

    if (difficulty) {
      queryBuilder.andWhere('puzzle.difficulty = :difficulty', { difficulty });
    }

    if (categoryIds?.length) {
      queryBuilder.andWhere('category.id IN (:...categoryIds)', {
        categoryIds,
      });
    }

    if (tagIds?.length) {
      queryBuilder.andWhere('tag.id IN (:...tagIds)', { tagIds });
    }

    if (search) {
      queryBuilder.andWhere(
        '(puzzle.title ILIKE :search OR puzzle.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Puzzle> {
    const puzzle = await this.puzzleRepository.findOne({
      where: { id },
      relations: [
        'categories',
        'tags',
        'creator',
        'versions',
        'analytics',
        'ratings',
      ],
    });

    if (!puzzle) {
      throw new NotFoundException(`Puzzle with ID ${id} not found`);
    }

    return puzzle;
  }

  async update(
    id: string,
    updatePuzzleDto: UpdatePuzzleDto,
    user: User,
  ): Promise<Puzzle> {
    const puzzle = await this.findOne(id);

    if (puzzle.creator.id !== user.id) {
      throw new BadRequestException('You can only update your own puzzles');
    }

    // Create new version if content is updated
    if (updatePuzzleDto.content) {
      await this.createVersion(
        puzzle,
        user,
        updatePuzzleDto.versionReason || 'Content update',
      );
    }

    // Update categories if provided
    if (updatePuzzleDto.categoryIds) {
      puzzle.categories = await this.categoryRepository.findBy({
        id: In(updatePuzzleDto.categoryIds),
      });
    }

    // Update tags if provided
    if (updatePuzzleDto.tagIds) {
      puzzle.tags = await this.tagRepository.findBy({
        id: In(updatePuzzleDto.tagIds),
      });
    }

    Object.assign(puzzle, updatePuzzleDto);
    return this.puzzleRepository.save(puzzle);
  }

  async remove(id: string, user: User): Promise<void> {
    const puzzle = await this.findOne(id);

    if (puzzle.creator.id !== user.id) {
      throw new BadRequestException('You can only delete your own puzzles');
    }

    await this.puzzleRepository.remove(puzzle);
  }

  async createVersion(
    puzzle: Puzzle,
    user: User,
    reason: string,
  ): Promise<PuzzleVersion> {
    const latestVersion = await this.versionRepository.findOne({
      where: { puzzle: { id: puzzle.id } },
      order: { versionNumber: 'DESC' },
    });

    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const version = this.versionRepository.create({
      puzzle,
      versionNumber,
      content: puzzle.content,
      metadata: {
        changes: [reason],
        reason,
        previousVersion: latestVersion?.id,
      },
      createdBy: user,
    });

    return this.versionRepository.save(version);
  }

  async trackAnalytics(
    puzzleId: string,
    userId: string,
    analytics: Partial<PuzzleAnalytics>,
  ): Promise<PuzzleAnalytics> {
    const puzzle = await this.findOne(puzzleId);
    const user = { id: userId } as User;

    const puzzleAnalytics = this.analyticsRepository.create({
      puzzle,
      user,
      ...analytics,
    });

    return this.analyticsRepository.save(puzzleAnalytics);
  }

  async ratePuzzle(
    puzzleId: string,
    userId: string,
    rating: Partial<PuzzleRating>,
  ): Promise<PuzzleRating> {
    const puzzle = await this.findOne(puzzleId);
    const user = { id: userId } as User;

    const puzzleRating = this.ratingRepository.create({
      puzzle,
      user,
      ...rating,
    });

    const savedRating = await this.ratingRepository.save(puzzleRating);

    // Update puzzle's average rating
    const ratings = await this.ratingRepository.find({
      where: { puzzle: { id: puzzleId } },
    });

    const averageRating =
      ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;
    puzzle.averageRating = averageRating;
    await this.puzzleRepository.save(puzzle);

    return savedRating;
  }

  async exportPuzzle(id: string, format: string): Promise<any> {
    const puzzle = await this.findOne(id);
    // Implement export logic based on format (JSON, CSV, etc.)
    return puzzle;
  }

  async importPuzzle(data: any, user: User): Promise<Puzzle> {
    // Implement import logic
    return this.create(data, user);
  }

  async moderatePuzzle(
    id: string,
    moderatorId: string,
    approved: boolean,
  ): Promise<Puzzle> {
    const puzzle = await this.findOne(id);
    puzzle.isModerated = true;
    puzzle.lastModeratedAt = new Date();
    puzzle.moderatedBy = moderatorId;
    puzzle.status = approved ? PuzzleStatus.PUBLISHED : PuzzleStatus.DRAFT;
    return this.puzzleRepository.save(puzzle);
  }
}
