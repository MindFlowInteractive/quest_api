import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailTables1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE email_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        variables JSONB,
        is_active BOOLEAN DEFAULT true,
        category VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TYPE email_status AS ENUM (
        'queued',
        'sent',
        'failed',
        'delivered',
        'opened',
        'clicked',
        'bounced'
      );

      CREATE TABLE email_tracking (
        id UUID PRIMARY KEY,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        status email_status DEFAULT 'queued',
        message_id VARCHAR(255),
        error TEXT,
        metadata JSONB,
        events JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE TABLE email_preferences (
        email VARCHAR(255) PRIMARY KEY,
        preferences JSONB DEFAULT '{"marketing": true, "transactional": true, "newsletters": true, "announcements": true}',
        is_unsubscribed BOOLEAN DEFAULT false,
        unsubscribe_token VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_email_tracking_message_id ON email_tracking(message_id);
      CREATE INDEX idx_email_tracking_status ON email_tracking(status);
      CREATE INDEX idx_email_preferences_unsubscribe_token ON email_preferences(unsubscribe_token);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_templates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_tracking;`);
    await queryRunner.query(`DROP TYPE IF EXISTS email_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_preferences;`);
  }
}
