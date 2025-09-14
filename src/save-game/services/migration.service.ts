import { Injectable } from '@nestjs/common';

/**
 * Simple migration registry: map from oldVersion => migrate(oldData) => newData
 * When loading a save with version < CURRENT_VERSION, we apply migrations in sequence.
 */

@Injectable()
export class SaveMigrationService {
  readonly CURRENT_VERSION = 2;

  // map version -> (oldData) => newData
  private migrations: Record<number, (d: any) => any> = {
    // migrate v1 -> v2
    1: (old) => {
      // Example: in v2 we introduced "player.stats.level" from "playerLevel"
      const copy = { ...old };
      if (copy.playerLevel && !copy.player) copy.player = {};
      if (copy.playerLevel) {
        copy.player.stats = copy.player.stats || {};
        copy.player.stats.level = copy.playerLevel;
        delete copy.playerLevel;
      }
      return copy;
    },
  };

  async migrateIfNeeded(data: any, version: number) {
    let current = version ?? 1;
    let out = data;
    while (current < this.CURRENT_VERSION) {
      const fn = this.migrations[current];
      if (!fn) {
        // if there's no migration function, we stop to avoid data loss
        break;
      }
      out = fn(out);
      current++;
    }
    return { data: out, version: this.CURRENT_VERSION };
  }
}
