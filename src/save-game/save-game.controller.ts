import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SaveGameService } from './save-game.service';
import { CreateSaveGameDto } from './dto/create-save-game.dto';
import { UpdateSaveGameDto } from './dto/update-save-game.dto';
import { SyncSaveGameDto } from './dto/sync-save-game.dto';

@Controller('save-games')
export class SaveGameController {
  constructor(private svc: SaveGameService) {}

  /**
   * Manual create save
   */
  @Post()
  async create(@Body() dto: CreateSaveGameDto) {
    const created = await this.svc.createSave({
      userId: dto.userId,
      slot: dto.slot,
      data: dto.data,
      version: dto.version,
      platform: dto.platform,
      isCloud: dto.isCloud,
      note: dto.note,
    });
    return { ok: true, save: created };
  }

  /**
   * Load latest save for a user/slot
   * GET /save-games/:userId/:slot
   */
  @Get(':userId/:slot')
  async load(@Param('userId') userId: string, @Param('slot') slot: string) {
    const save = await this.svc.loadLatest(userId, slot);
    return { ok: true, save };
  }

  /**
   * Update a save by id (overwrite)
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSaveGameDto) {
    const updated = await this.svc.updateSave(id, dto);
    return { ok: true, save: updated };
  }

  /**
   * Delete save
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.svc.deleteSave(id);
    return { ok: true };
  }

  /**
   * Sync endpoint (client driven cloud sync)
   * POST /save-games/sync
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: SyncSaveGameDto) {
    const result = await this.svc.syncSave({
      userId: dto.userId,
      slot: dto.slot,
      data: dto.data,
      version: dto.version,
      platform: dto.platform,
      clientUpdatedAt: dto.clientUpdatedAt,
      isCloud: dto.isCloud,
    });
    return { ok: true, result };
  }

  /**
   * Get backups
   */
  @Get('backups/:userId/:slot')
  async backups(@Param('userId') userId: string, @Param('slot') slot: string) {
    const backups = await this.svc.getBackups(userId, slot);
    return { ok: true, backups };
  }
}
