import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1700000000000 implements MigrationInterface {
  name = 'CreateInitialTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('player', 'admin', 'moderator')
    `);

    await queryRunner.query(`
      CREATE TYPE "difficulty_preference_enum" AS ENUM('easy', 'medium', 'hard', 'expert')
    `);

    await queryRunner.query(`
      CREATE TYPE "puzzle_type_enum" AS ENUM('logic', 'math', 'word', 'visual', 'memory')
    `);

    await queryRunner.query(`
      CREATE TYPE "difficulty_level_enum" AS ENUM('1', '2', '3', '4', '5')
    `);

    await queryRunner.query(`
      CREATE TYPE "progress_status_enum" AS ENUM('not_started', 'in_progress', 'completed', 'failed', 'skipped')
    `);

    await queryRunner.query(`
      CREATE TYPE "achievement_type_enum" AS ENUM('puzzle_completion', 'score_milestone', 'time_based', 'streak', 'difficulty', 'category', 'special')
    `);

    await queryRunner.query(`
      CREATE TYPE "achievement_rarity_enum" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary')
    `);

    await queryRunner.query(`
      CREATE TYPE "session_status_enum" AS ENUM('active', 'completed', 'abandoned', 'paused')
    `);

    await queryRunner.query(`
      CREATE TYPE "device_type_enum" AS ENUM('desktop', 'mobile', 'tablet')
    `);

    // Create Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying(50) NOT NULL,
        "email" character varying(100) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "displayName" character varying(100),
        "avatar" text,
        "role" "user_role_enum" NOT NULL DEFAULT 'player',
        "totalScore" integer NOT NULL DEFAULT '0',
        "level" integer NOT NULL DEFAULT '1',
        "experience" integer NOT NULL DEFAULT '0',
        "preferredDifficulty" "difficulty_preference_enum" NOT NULL DEFAULT 'easy',
        "soundEnabled" boolean NOT NULL DEFAULT true,
        "notificationsEnabled" boolean NOT NULL DEFAULT true,
        "language" character varying(10) NOT NULL DEFAULT 'en',
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Create Puzzles table
    await queryRunner.query(`
      CREATE TABLE "puzzles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "type" "puzzle_type_enum" NOT NULL,
        "category" character varying(100) NOT NULL,
        "difficultyLevel" "difficulty_level_enum" NOT NULL,
        "difficultyRating" numeric(3,2) NOT NULL DEFAULT '0',
        "puzzleData" json NOT NULL,
        "solution" json NOT NULL,
        "hints" json,
        "maxScore" integer NOT NULL DEFAULT '100',
        "timeLimit" integer NOT NULL DEFAULT '300',
        "playCount" integer NOT NULL DEFAULT '0',
        "completionCount" integer NOT NULL DEFAULT '0',
        "averageCompletionTime" numeric(5,2) NOT NULL DEFAULT '0',
        "successRate" numeric(3,2) NOT NULL DEFAULT '0',
        "imageUrl" text,
        "tags" json,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdBy" character varying(100) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_puzzles" PRIMARY KEY ("id")
      )
    `);

    // Create Achievements table
    await queryRunner.query(`
      CREATE TABLE "achievements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "type" "achievement_type_enum" NOT NULL,
        "rarity" "achievement_rarity_enum" NOT NULL DEFAULT 'common',
        "iconUrl" text,
        "points" integer NOT NULL DEFAULT '0',
        "unlockConditions" json NOT NULL,
        "isSecret" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "unlockedCount" integer NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_achievements" PRIMARY KEY ("id")
      )
    `);

    // Create Puzzle Progress table
    await queryRunner.query(`
      CREATE TABLE "puzzle_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "puzzleId" uuid NOT NULL,
        "status" "progress_status_enum" NOT NULL DEFAULT 'not_started',
        "currentScore" integer NOT NULL DEFAULT '0',
        "bestScore" integer NOT NULL DEFAULT '0',
        "attempts" integer NOT NULL DEFAULT '0',
        "hintsUsed" integer NOT NULL DEFAULT '0',
        "bestTime" numeric(8,2),
        "totalTimeSpent" numeric(8,2),
        "currentState" json,
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "lastPlayedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_puzzle_progress" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_puzzle_progress_user_puzzle" UNIQUE ("userId", "puzzleId")
      )
    `);

    // Create User Achievements table
    await queryRunner.query(`
      CREATE TABLE "user_achievements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "achievementId" uuid NOT NULL,
        "progress" numeric(5,2) NOT NULL DEFAULT '0',
        "isUnlocked" boolean NOT NULL DEFAULT false,
        "unlockedAt" TIMESTAMP,
        "metadata" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_achievements" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_achievements_user_achievement" UNIQUE ("userId", "achievementId")
      )
    `);

    // Create Game Sessions table
    await queryRunner.query(`
      CREATE TABLE "game_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "status" "session_status_enum" NOT NULL DEFAULT 'active',
        "startedAt" TIMESTAMP NOT NULL,
        "endedAt" TIMESTAMP,
        "duration" numeric(10,2) NOT NULL DEFAULT '0',
        "puzzlesAttempted" integer NOT NULL DEFAULT '0',
        "puzzlesCompleted" integer NOT NULL DEFAULT '0',
        "totalScore" integer NOT NULL DEFAULT '0',
        "experienceGained" integer NOT NULL DEFAULT '0',
        "deviceType" "device_type_enum",
        "userAgent" character varying(200),
        "ipAddress" character varying(45),
        "sessionData" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_game_sessions" PRIMARY KEY ("id")
      )
    `);

    // Add Foreign Key Constraints
    await queryRunner.query(`
      ALTER TABLE "puzzle_progress" 
      ADD CONSTRAINT "FK_puzzle_progress_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "puzzle_progress" 
      ADD CONSTRAINT "FK_puzzle_progress_puzzle" 
      FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      ADD CONSTRAINT "FK_user_achievements_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_achievements" 
      ADD CONSTRAINT "FK_user_achievements_achievement" 
      FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "game_sessions" 
      ADD CONSTRAINT "FK_game_sessions_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "game_sessions" DROP CONSTRAINT "FK_game_sessions_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "FK_user_achievements_achievement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "FK_user_achievements_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "puzzle_progress" DROP CONSTRAINT "FK_puzzle_progress_puzzle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "puzzle_progress" DROP CONSTRAINT "FK_puzzle_progress_user"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "game_sessions"`);
    await queryRunner.query(`DROP TABLE "user_achievements"`);
    await queryRunner.query(`DROP TABLE "puzzle_progress"`);
    await queryRunner.query(`DROP TABLE "achievements"`);
    await queryRunner.query(`DROP TABLE "puzzles"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE "device_type_enum"`);
    await queryRunner.query(`DROP TYPE "session_status_enum"`);
    await queryRunner.query(`DROP TYPE "achievement_rarity_enum"`);
    await queryRunner.query(`DROP TYPE "achievement_type_enum"`);
    await queryRunner.query(`DROP TYPE "progress_status_enum"`);
    await queryRunner.query(`DROP TYPE "difficulty_level_enum"`);
    await queryRunner.query(`DROP TYPE "puzzle_type_enum"`);
    await queryRunner.query(`DROP TYPE "difficulty_preference_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
