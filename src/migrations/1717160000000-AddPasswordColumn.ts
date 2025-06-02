import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordColumn1717160000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password" character varying`,
    );

    await queryRunner.query(`
      UPDATE "users" 
      SET "password" = '$2b$10$defaultpasswordhash' 
      WHERE "password" IS NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
  }
}
