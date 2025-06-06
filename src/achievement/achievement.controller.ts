import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

import { AchievementService } from './achievement.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';

@ApiTags('Achievements')
@Controller('achievement')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new achievement' })
  @ApiBody({ type: CreateAchievementDto })
  @ApiResponse({ status: 201, description: 'Achievement created successfully' })
  create(@Body() createAchievementDto: CreateAchievementDto) {
    return this.achievementService.create(createAchievementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all achievements' })
  @ApiResponse({ status: 200, description: 'List of all achievements' })
  findAll() {
    return this.achievementService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get achievement by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Achievement details retrieved' })
  findOne(@Param('id') id: string) {
    return this.achievementService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing achievement' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateAchievementDto })
  @ApiResponse({ status: 200, description: 'Achievement updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateAchievementDto: UpdateAchievementDto,
  ) {
    return this.achievementService.update(+id, updateAchievementDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an achievement by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Achievement deleted successfully' })
  remove(@Param('id') id: string) {
    return this.achievementService.remove(+id);
  }
}
