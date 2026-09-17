import type { ZoneId } from '../data/spawnTables';

/**
 * The player's current zone/tile position, tracked separately from
 * `WorldScene`'s own private `zoneDef`/`gridCol`/`gridRow` fields so the
 * save/load system (`src/state/save.ts`) has something to read without
 * reaching into scene internals. `WorldScene` is the sole writer (see its
 * `init()` and `update()`) - it calls `setWorldPosition` whenever the
 * player's zone or grid tile changes; everything else only reads via
 * `getWorldPosition()`. `null` until `WorldScene` has actually run at least
 * once this session (e.g. if `SAVE` were somehow reachable before then).
 */
export interface WorldPosition {
  zoneId: ZoneId;
  col: number;
  row: number;
}

let currentPosition: WorldPosition | null = null;

export function setWorldPosition(zoneId: ZoneId, col: number, row: number): void {
  currentPosition = { zoneId, col, row };
}

export function getWorldPosition(): WorldPosition | null {
  return currentPosition;
}
