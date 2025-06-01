import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEmailTrackingRecipient1717161600001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      ADD COLUMN "recipient" character varying;
    `);

    await queryRunner.query(`
      UPDATE "email_tracking"
      SET "recipient" = 'unknown@example.com'
      WHERE "recipient" IS NULL;
    `);

    // Now make the column non-nullable
    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      ALTER COLUMN "recipient" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      DROP COLUMN "recipient";
    `);
  }
}
