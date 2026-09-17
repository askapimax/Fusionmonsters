import { createFounderGenome } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import type { RNG } from '../genetics/rng';

/**
 * Wild-encounter rolling for tall-grass tiles (`TILES[...].encounterZone`
 * in src/data/tiles.ts). There's only one zone so far and Fusions are
 * procedural rather than a fixed species roster, so this is deliberately
 * simple: any step onto an encounter tile has a flat chance to spawn one
 * random founder Fusion. Per-zone spawn tables biased toward certain
 * types/parts (README "Spawns & Named Bosses") are still future work.
 */
export const ENCOUNTER_CHANCE_PER_STEP = 0.12;

export function rollForEncounter(rng: RNG): boolean {
  return rng() < ENCOUNTER_CHANCE_PER_STEP;
}

export function generateWildFusion(rng: RNG): Fusion {
  return createFusion(createFounderGenome(rng));
}
