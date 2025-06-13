import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateAntiCheatTables1734134400000 implements MigrationInterface {
  name = 'CreateAntiCheatTables1734134400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cheat_detections table
    await queryRunner.createTable(
      new Table({
        name: 'cheat_detections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'puzzleId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'puzzleType',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'detectionType',
            type: 'enum',
            enum: ['timing_anomaly', 'solution_impossible', 'sequence_invalid', 'pattern_suspicious', 'statistical_outlier'],
            isNullable: false,
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            default: "'medium'",
            isNullable: false,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            default: 0,
            isNullable: false,
          },
          {
            name: 'details',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'false_positive', 'dismissed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'reviewedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'reviewNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create manual_reviews table
    await queryRunner.createTable(
      new Table({
        name: 'manual_reviews',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cheatDetectionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'reviewerId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'in_progress', 'completed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'medium'",
            isNullable: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'decision',
            type: 'enum',
            enum: ['confirmed_cheat', 'false_positive', 'needs_more_data', 'inconclusive'],
            isNullable: true,
          },
          {
            name: 'reasoning',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'assignedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create appeals table
    await queryRunner.createTable(
      new Table({
        name: 'appeals',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'appellantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'cheatDetectionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'evidence',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'under_review', 'approved', 'rejected'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'reviewerId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewerNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reviewedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'outcome',
            type: 'enum',
            enum: ['false_positive_confirmed', 'cheat_confirmed', 'insufficient_evidence'],
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create community_reports table
    await queryRunner.createTable(
      new Table({
        name: 'community_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'reporterId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'reportedUserId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'reportType',
            type: 'enum',
            enum: ['cheating', 'unfair_play', 'suspicious_behavior', 'other'],
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'evidence',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'investigating', 'resolved', 'dismissed'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'moderatorId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'moderatorNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resolvedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'cheat_detections',
      new ForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'manual_reviews',
      new ForeignKey({
        columnNames: ['cheatDetectionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cheat_detections',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'manual_reviews',
      new ForeignKey({
        columnNames: ['reviewerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'appeals',
      new ForeignKey({
        columnNames: ['appellantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'appeals',
      new ForeignKey({
        columnNames: ['cheatDetectionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cheat_detections',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'community_reports',
      new ForeignKey({
        columnNames: ['reporterId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'community_reports',
      new ForeignKey({
        columnNames: ['reportedUserId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for better performance
    await queryRunner.createIndex('cheat_detections', new Index('IDX_cheat_detections_user', ['userId']));
    await queryRunner.createIndex('cheat_detections', new Index('IDX_cheat_detections_puzzle', ['puzzleId']));
    await queryRunner.createIndex('cheat_detections', new Index('IDX_cheat_detections_status', ['status']));
    await queryRunner.createIndex('cheat_detections', new Index('IDX_cheat_detections_severity', ['severity']));
    await queryRunner.createIndex('cheat_detections', new Index('IDX_cheat_detections_created', ['createdAt']));

    await queryRunner.createIndex('manual_reviews', new Index('IDX_manual_reviews_status', ['status']));
    await queryRunner.createIndex('manual_reviews', new Index('IDX_manual_reviews_reviewer', ['reviewerId']));
    await queryRunner.createIndex('manual_reviews', new Index('IDX_manual_reviews_priority', ['priority']));

    await queryRunner.createIndex('appeals', new Index('IDX_appeals_appellant', ['appellantId']));
    await queryRunner.createIndex('appeals', new Index('IDX_appeals_status', ['status']));
    await queryRunner.createIndex('appeals', new Index('IDX_appeals_created', ['createdAt']));

    await queryRunner.createIndex('community_reports', new Index('IDX_community_reports_reporter', ['reporterId']));
    await queryRunner.createIndex('community_reports', new Index('IDX_community_reports_reported', ['reportedUserId']));
    await queryRunner.createIndex('community_reports', new Index('IDX_community_reports_status', ['status']));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('community_reports');
    await queryRunner.dropTable('appeals');
    await queryRunner.dropTable('manual_reviews');
    await queryRunner.dropTable('cheat_detections');
  }
}
