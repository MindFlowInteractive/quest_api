import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEmailTracking1717161600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      ADD COLUMN "new_id" uuid DEFAULT uuid_generate_v4()
    `);

    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      DROP CONSTRAINT IF EXISTS "PK_d28cfe7b1e330e2ae4a08c0010f"
    `);

    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      DROP COLUMN "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      RENAME COLUMN "new_id" TO "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      ADD CONSTRAINT "PK_email_tracking" PRIMARY KEY ("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      DROP CONSTRAINT IF EXISTS "PK_email_tracking"
    `);

    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      DROP COLUMN "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      ADD COLUMN "id" SERIAL PRIMARY KEY
    `);
  }
}
