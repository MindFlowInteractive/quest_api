import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaveGame } from './entities/save-game.entity';
import { SaveGameService } from './save-game.service';
import { SaveGameController } from './save-game.controller';
import { SaveMigrationService } from './services/migration.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaveGame])],
  providers: [SaveGameService, SaveMigrationService],
  controllers: [SaveGameController],
  exports: [SaveGameService],
})
export class SaveGameModule {}
