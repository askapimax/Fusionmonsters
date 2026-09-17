import { pickWeighted, type RNG } from '../genetics/rng';
import type { CycleTypeId } from './types';

/**
 * Per-zone wild-encounter spawn tables (README "Spawns & Named Bosses"):
 * the set of types that can appear in a given zone, each with its own
 * spawn weight, so some are common finds and others are rare - the same
 * weighted-random pattern the part catalog already uses for
 * `rarityWeight` (see src/data/parts.ts), applied to primary type instead
 * of part choice. Parts/traits/moves/stats stay fully random within
 * whichever type gets rolled; only the type itself is zone-biased.
 */
export interface SpawnTableEntry {
  type: CycleTypeId;
  weight: number;
}

export type SpawnTable = SpawnTableEntry[];

export type ZoneId = 'fernbrook_outpost';

export const ZONE_SPAWN_TABLES: Record<ZoneId, SpawnTable> = {
  // Fernbrook Outpost: open grass, tall-grass patches, and a pond - flora
  // and aqua life is common, aero/toxin/ferro/volt turn up less often, and
  // thermal/mineral/photon (native to biomes this zone doesn't have) are
  // rare finds this far from home.
  fernbrook_outpost: [
    { type: 'flora', weight: 10 },
    { type: 'aqua', weight: 8 },
    { type: 'aero', weight: 6 },
    { type: 'toxin', weight: 4 },
    { type: 'ferro', weight: 3 },
    { type: 'volt', weight: 3 },
    { type: 'mineral', weight: 2 },
    { type: 'thermal', weight: 1 },
    { type: 'photon', weight: 1 },
  ],
};

export function pickSpawnType(table: SpawnTable, rng: RNG): CycleTypeId {
  return pickWeighted(table, (entry) => entry.weight, rng).type;
}
