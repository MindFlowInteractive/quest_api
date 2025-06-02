import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like as TypeOrmLike } from 'typeorm';
import { Puzzle, PuzzleStatus } from './entities/puzzle.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { PuzzleVersion } from './entities/puzzle-version.entity';
import { PuzzleAnalytics } from './entities/puzzle-analytics.entity';
import { PuzzleRating } from './entities/puzzle-rating.entity';
import { Review } from './entities/review.entity';
import { CreatePuzzleDto } from './dto/create-puzzle.dto';
import { UpdatePuzzleDto } from './dto/update-puzzle.dto';
import { User } from '../user/entities/user.entity';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { Feedback } from './entities/feedback.entity';
import { PuzzleProgress } from './entities/progress.entity';

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
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(PuzzleProgress)
    private progressRepository: Repository<PuzzleProgress>,
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
    if ((updatePuzzleDto as any).content) {
      await this.createVersion(
        puzzle,
        user,
        (updatePuzzleDto as any).versionReason || 'Content update',
      );
    }

    // Update categories if provided
    if ((updatePuzzleDto as any).categoryIds) {
      puzzle.categories = await this.categoryRepository.findBy({
        id: In((updatePuzzleDto as any).categoryIds),
      });
    }

    // Update tags if provided
    if ((updatePuzzleDto as any).tagIds) {
      puzzle.tags = await this.tagRepository.findBy({
        id: In((updatePuzzleDto as any).tagIds),
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
      ratings.reduce((acc: number, curr: PuzzleRating) => acc + curr.rating, 0) /
      (ratings.length || 1);
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

  // --- Review Methods ---
  async addOrUpdateReview(
    puzzleId: string,
    user: User,
    dto: { rating: number; comment?: string },
  ) {
    const puzzle = await this.findOne(puzzleId);
    let review = await this.reviewRepository.findOne({
      where: { puzzle: { id: puzzleId }, user: { id: user.id } },
    });
    if (review) {
      review.rating = dto.rating;
      review.comment = dto.comment;
      await this.reviewRepository.save(review);
      return { message: 'Review updated', review };
    } else {
      review = this.reviewRepository.create({
        puzzle,
        user,
        rating: dto.rating,
        comment: dto.comment,
      });
      await this.reviewRepository.save(review);
      return { message: 'Review created', review };
    }
  }

  async deleteReview(puzzleId: string, reviewId: string, user: User) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, puzzle: { id: puzzleId } },
      relations: ['user'],
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.user.id !== user.id && user.role !== 'admin') {
      throw new BadRequestException('You can only delete your own review');
    }
    await this.reviewRepository.remove(review);
    return { message: 'Review deleted' };
  }

  async getReviews(puzzleId: string) {
    const reviews = await this.reviewRepository.find({
      where: { puzzle: { id: puzzleId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return { reviews };
  }
  // --- Like Methods ---
  async likePuzzle(puzzleId: string, user: User) {
    const puzzle = await this.findOne(puzzleId);
    let like = await this.likeRepository.findOne({
      where: { puzzle: { id: puzzleId }, user: { id: user.id } },
    });
    if (like) {
      // Unlike if already liked
      await this.likeRepository.remove(like);
      puzzle.shareCount = Math.max(0, (puzzle.shareCount || 0) - 1);
      await this.puzzleRepository.save(puzzle);
      return { message: 'Puzzle unliked' };
    } else {
      like = this.likeRepository.create({ puzzle, user });
      await this.likeRepository.save(like);
      puzzle.shareCount = (puzzle.shareCount || 0) + 1;
      await this.puzzleRepository.save(puzzle);
      return { message: 'Puzzle liked' };
    }
  }
  // --- Comment Methods ---
  async addComment(puzzleId: string, user: User, dto: { content: string }) {
    const puzzle = await this.findOne(puzzleId);
    const comment = this.commentRepository.create({
      puzzle,
      user,
      content: dto.content,
    });
    await this.commentRepository.save(comment);
    return { message: 'Comment added', comment };
  }

  async getComments(puzzleId: string) {
    const comments = await this.commentRepository.find({
      where: { puzzle: { id: puzzleId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return { comments };
  }
  // --- Feedback Methods ---
  async submitFeedback(
    puzzleId: string,
    user: User,
    dto: { comment?: string; difficulty?: number; quality?: number },
  ) {
    const puzzle = await this.findOne(puzzleId);
    let feedback = await this.feedbackRepository.findOne({
      where: { puzzle: { id: puzzleId }, user: { id: user.id } },
    });
    if (feedback) {
      feedback.comment = dto.comment;
      feedback.difficulty = dto.difficulty;
      feedback.quality = dto.quality;
      await this.feedbackRepository.save(feedback);
      return { message: 'Feedback updated', feedback };
    } else {
      feedback = this.feedbackRepository.create({
        puzzle,
        user,
        comment: dto.comment,
        difficulty: dto.difficulty,
        quality: dto.quality,
      });
      await this.feedbackRepository.save(feedback);
      return { message: 'Feedback submitted', feedback };
    }
  }
  // --- Progression Methods ---
  async unlockPuzzle(puzzleId: string, user: User) {
    const puzzle = await this.findOne(puzzleId);
    let progress = await this.progressRepository.findOne({
      where: { puzzle: { id: puzzleId }, user: { id: user.id } },
    });
    if (!progress) {
      progress = this.progressRepository.create({
        puzzle,
        user,
        completed: false,
      });
      await this.progressRepository.save(progress);
      return { message: 'Puzzle unlocked', progress };
    }
    return { message: 'Puzzle already unlocked', progress };
  }

  async getUnlockStatus(puzzleId: string, user: User) {
    const progress = await this.progressRepository.findOne({
      where: { puzzle: { id: puzzleId }, user: { id: user.id } },
    });
    return { unlocked: !!progress };
  }

  async getUserProgress(userId: string) {
    const progress = await this.progressRepository.find({
      where: { user: { id: userId } },
      relations: ['puzzle'],
    });
    return { progress };
  }
}
