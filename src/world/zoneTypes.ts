import type { ZoneId } from '../data/spawnTables';

/**
 * Shared types for the zone-transition system (TODO "Zone-transition
 * system"). Pulled into their own tiny module so both a zone's own map file
 * (e.g. `startingZone.ts`, `routeOneStub.ts`) and the zone registry
 * (`zones.ts`) can import them without an import cycle between the two.
 */

export interface ZoneSpawn {
  col: number;
  row: number;
}

/**
 * A single declared exit tile on a zone's map: stepping onto `(col, row)`
 * transitions the player to `targetZoneId`, placed at `targetSpawn` there.
 * Purely data - a zone's map file just lists these alongside its ground/
 * props, and `WorldScene` consumes them generically (see
 * `WorldScene.maybeTriggerZoneTransition`).
 */
export interface ZoneExit {
  col: number;
  row: number;
  targetZoneId: ZoneId;
  targetSpawn: ZoneSpawn;
}
