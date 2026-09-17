import { createFounderGenome } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import type { RNG } from '../genetics/rng';
import { pickSpawnType, type SpawnTable } from './spawnTables';

/**
 * Wild-encounter rolling for tall-grass tiles (`TILES[...].encounterZone`
 * in src/data/tiles.ts). Any step onto an encounter tile has a flat chance
 * to spawn one random founder Fusion, with its primary type biased by the
 * current zone's spawn table (`src/data/spawnTables.ts`, README "Spawns &
 * Named Bosses") when one is given. Parts/traits/moves/stats are still
 * fully random - only the type itself is zone-biased so far. Named-boss
 * placements and the 2-minute respawn timer are still future work.
 */
export const ENCOUNTER_CHANCE_PER_STEP = 0.12;

export function rollForEncounter(rng: RNG): boolean {
  return rng() < ENCOUNTER_CHANCE_PER_STEP;
}

export function generateWildFusion(rng: RNG, spawnTable?: SpawnTable): Fusion {
  const forcedPrimaryType = spawnTable && spawnTable.length > 0 ? pickSpawnType(spawnTable, rng) : undefined;
  return createFusion(createFounderGenome(rng, { forcedPrimaryType }));
}
