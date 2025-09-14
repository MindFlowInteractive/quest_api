import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { SaveGame } from './entities/save-game.entity';
import { compressObjectToBase64, decompressBase64ToObject } from './utils/compression.util';
import { resolveConflict } from './strategies/conflict-resolution.strategy';
import { SaveMigrationService } from './services/migration.service';

@Injectable()
export class SaveGameService {
  // how many backups to retain per user-slot
  private readonly BACKUP_RETENTION = 3;

  constructor(
    @InjectRepository(SaveGame) private repo: Repository<SaveGame>,
    private migrationService: SaveMigrationService,
  ) {}

  /**
   * Create a save (manual or autosave).
   */
  async createSave({
    userId,
    slot,
    data,
    version = 1,
    platform = 'PC',
    isCloud = true,
    note,
    isBackup = false,
  }: {
    userId: string;
    slot: string;
    data: any;
    version?: number;
    platform?: string;
    isCloud?: boolean;
    note?: string;
    isBackup?: boolean;
  }) {
    // compress
    const compressedData = await compressObjectToBase64(data);
    const entity = this.repo.create({
      userId,
      slot,
      compressedData,
      version,
      platform,
      isCloud,
      isBackup,
      note,
    });
    const saved = await this.repo.save(entity);

    // If this is not backup, keep backups (last N saves)
    if (!isBackup) {
      await this.trimBackups(userId, slot);
    }

    return this.toDto(saved);
  }

  /**
   * Load latest save for user-slot (excluding backups unless includeBackups flag)
   */
  async loadLatest(userId: string, slot: string, includeBackups = false) {
    const where: any = { userId, slot };
    if (!includeBackups) where.isBackup = false;

    const saved = await this.repo.findOne({
      where,
      order: { updatedAt: 'DESC' },
    });
    if (!saved) throw new NotFoundException('No save found');
    const data = await decompressBase64ToObject(saved.compressedData);
    // migrations
    const migrated = await this.migrationService.migrateIfNeeded(data, saved.version);
    return {
      ...this.toDto(saved),
      data: migrated.data,
      version: migrated.version,
    };
  }

  /**
   * Update an existing save by id (overwrite data).
   */
  async updateSave(id: string, { data, version, platform, isCloud, note }: any) {
    const found = await this.repo.findOneBy({ id });
    if (!found) throw new NotFoundException('Save not found');
    if (data !== undefined) {
      found.compressedData = await compressObjectToBase64(data);
    }
    if (version !== undefined) found.version = version;
    if (platform !== undefined) found.platform = platform;
    if (isCloud !== undefined) found.isCloud = isCloud;
    if (note !== undefined) found.note = note;
    const saved = await this.repo.save(found);
    return this.toDto(saved);
  }

  /**
   * Delete save by id
   */
  async deleteSave(id: string) {
    const found = await this.repo.findOneBy({ id });
    if (!found) throw new NotFoundException('Save not found');
    await this.repo.remove(found);
    return { ok: true };
  }

  /**
   * Sync endpoint: reconcile client save with server save.
   * Basic algorithm:
   *  - find existing server save for user-slot
   *  - if none: create server save using incoming
   *  - if exists: run conflict resolution -> accept incoming / keep server / merged / conflict
   */
  async syncSave({
    userId,
    slot,
    data,
    version = 1,
    platform = 'PC',
    clientUpdatedAt,
    isCloud = true,
  }: {
    userId: string;
    slot: string;
    data: any;
    version?: number;
    platform?: string;
    clientUpdatedAt?: string;
    isCloud?: boolean;
  }) {
    const server = await this.repo.findOne({
      where: { userId, slot, isBackup: false },
      order: { updatedAt: 'DESC' },
    });

    if (!server) {
      // create a new cloud save
      const created = await this.createSave({ userId, slot, data, version, platform, isCloud });
      return { result: 'created', save: created };
    }

    // decompress server data for comparison
    const serverData = await decompressBase64ToObject(server.compressedData);
    const serverSave = { updatedAt: server.updatedAt, data: serverData };

    const incomingSave = { updatedAt: clientUpdatedAt ?? new Date().toISOString(), data };

    const resolution = resolveConflict({ serverSave, incomingSave, clientUpdatedAt });

    if (resolution.type === 'accept-incoming' || resolution.type === 'merged') {
      // create a backup of the server before overwriting
      await this.createSave({
        userId,
        slot,
        data: serverData,
        version: server.version,
        platform: server.platform,
        isCloud: server.isCloud,
        isBackup: true,
        note: 'backup-before-sync-' + new Date().toISOString(),
      });

      const compressed = await compressObjectToBase64(resolution.save.data);
      server.compressedData = compressed;
      server.version = version ?? server.version;
      server.platform = platform;
      server.isCloud = isCloud;
      const saved = await this.repo.save(server);

      // trim backups
      await this.trimBackups(userId, slot);

      const migrated = await this.migrationService.migrateIfNeeded(resolution.save.data, server.version);
      return { result: 'updated', type: resolution.type, save: { ...this.toDto(saved), data: migrated.data, version: migrated.version } };
    }

    if (resolution.type === 'keep-server') {
      const migrated = await this.migrationService.migrateIfNeeded(serverData, server.version);
      return { result: 'keep-server', save: { ...this.toDto(server), data: migrated.data, version: migrated.version } };
    }

    // conflict: return both versions and let client decide
    return {
      result: 'conflict',
      server: { ...this.toDto(server), data: serverData, version: server.version },
      incoming: { data, version },
    };
  }

  /**
   * Get backups (last N)
   */
  async getBackups(userId: string, slot: string) {
    const backups = await this.repo.find({
      where: { userId, slot, isBackup: true },
      order: { updatedAt: 'DESC' },
      take: this.BACKUP_RETENTION,
    });
    const out = await Promise.all(
      backups.map(async (b) => {
        const data = await decompressBase64ToObject(b.compressedData);
        return { ...this.toDto(b), data };
      }),
    );
    return out;
  }

  private async trimBackups(userId: string, slot: string) {
    // keep the last BACKUP_RETENTION backups, delete older ones
    const backups = await this.repo.find({
      where: { userId, slot, isBackup: true },
      order: { updatedAt: 'DESC' },
    });

    if (backups.length <= this.BACKUP_RETENTION) return;

    const toDelete = backups.slice(this.BACKUP_RETENTION);
    await this.repo.remove(toDelete);
  }

  private toDto(entity: SaveGame) {
    return {
      id: entity.id,
      userId: entity.userId,
      slot: entity.slot,
      version: entity.version,
      platform: entity.platform,
      isCloud: entity.isCloud,
      isBackup: entity.isBackup,
      note: entity.note,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
