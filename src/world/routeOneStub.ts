import type { PropPlacement } from '../data/props';
import type { ZoneId } from '../data/spawnTables';
import type { TileId } from '../data/tiles';
import type { ZoneExit } from './zoneTypes';

/**
 * PLACEHOLDER ZONE - NOT REAL LEVEL DESIGN.
 *
 * This exists purely to prove the zone-transition mechanism (TODO
 * "Zone-transition system") works end to end: something for Fernbrook
 * Outpost's south gap to actually lead to. It is intentionally tiny (a
 * small open grass field with a path leading back north) and has no wild-
 * encounter tall-grass patches, props beyond a couple of scenery trees, or
 * any other real content. Building the actual second zone (proper map,
 * its own tall-grass patches, etc.) is a separate, already-tracked TODO
 * item ("A second zone") - do not extend this file to do that; add a new
 * zone file instead and follow this one + `startingZone.ts` as the
 * pattern.
 */

export const ZONE_ID: ZoneId = 'route_one_stub';
export const ZONE_NAME = 'Route 1 (Placeholder)';
export const MAP_COLS = 12;
export const MAP_ROWS = 10;

// Entry point from Fernbrook Outpost's south gap - one tile south of the
// zone's own northern edge/return-exit row, so arriving here doesn't
// immediately re-trigger the walk back north.
export const SPAWN = { col: 5, row: 1 };

function buildGround(): TileId[][] {
  const map: TileId[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 'grass' as TileId),
  );

  const set = (row: number, col: number, tile: TileId): void => {
    if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
      map[row][col] = tile;
    }
  };

  // A short path down the middle, lined up with the two exit/return tiles
  // below, mirroring Fernbrook's own two-tile-wide path.
  for (let row = 0; row < MAP_ROWS; row++) {
    set(row, 5, 'path');
    set(row, 6, 'path');
  }

  return map;
}

function buildProps(): PropPlacement[] {
  // A couple of scenery trees, just enough to make this visibly a
  // different map from Fernbrook rather than a copy - not real level
  // design (see file-level comment above).
  return [
    { type: 'tree', col: 1, row: 4 },
    { type: 'tree', col: 9, row: 6 },
  ];
}

export const ROUTE_ONE_STUB_GROUND: TileId[][] = buildGround();
export const ROUTE_ONE_STUB_PROPS: PropPlacement[] = buildProps();

/**
 * Return exits back to Fernbrook Outpost, lined up with the two path
 * columns and Fernbrook's own south-gap exit tiles/spawns (see
 * `startingZone.ts#ZONE_EXITS`) - walking north out of this zone's top
 * edge lands one tile south of Fernbrook's south edge, again to avoid an
 * instant bounce back.
 */
export const ZONE_EXITS: ZoneExit[] = [
  { col: 5, row: 0, targetZoneId: 'fernbrook_outpost', targetSpawn: { col: 20, row: 28 } },
  { col: 6, row: 0, targetZoneId: 'fernbrook_outpost', targetSpawn: { col: 21, row: 28 } },
];
