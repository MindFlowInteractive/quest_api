import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DifficultyProfile } from './difficulty.entity';
import { DifficultyService } from './difficulty.service';
import { DifficultyController } from './difficulty.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DifficultyProfile])],
  providers: [DifficultyService],
  controllers: [DifficultyController],
  exports: [DifficultyService],
})
export class DifficultyModule {}
