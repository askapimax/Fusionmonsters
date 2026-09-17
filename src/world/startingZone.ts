import type { PropPlacement } from '../data/props';
import type { ZoneId } from '../data/spawnTables';
import type { TileId } from '../data/tiles';
import type { TrainerId } from '../data/trainers';

/**
 * The game's first zone: "Fernbrook Outpost", a small Concord waystation at
 * the edge of the Reach. This is where a new Splicer's journey begins -
 * see README.md "Setting" / "Player's role". Layout, prop placement, and
 * tall-grass patches here are a first pass, not final level design.
 */

export const ZONE_ID: ZoneId = 'fernbrook_outpost';
export const ZONE_NAME = 'Fernbrook Outpost';
export const MAP_COLS = 40;
export const MAP_ROWS = 30;

export const SPAWN = { col: 20, row: 9 };

function buildGround(): TileId[][] {
  const map: TileId[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 'grass' as TileId),
  );

  const set = (row: number, col: number, tile: TileId): void => {
    if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
      map[row][col] = tile;
    }
  };

  const rect = (row0: number, col0: number, row1: number, col1: number, tile: TileId): void => {
    for (let row = row0; row <= row1; row++) {
      for (let col = col0; col <= col1; col++) {
        set(row, col, tile);
      }
    }
  };

  // The path from the field office's door down to the south gap.
  rect(8, 20, MAP_ROWS - 1, 21, 'path');

  // Tall-grass patches (future wild-encounter zones - not wired up yet).
  rect(10, 10, 12, 12, 'tall_grass');
  rect(15, 27, 17, 29, 'tall_grass');
  rect(20, 8, 22, 10, 'tall_grass');

  // A small pond.
  rect(8, 30, 9, 33, 'water');

  return map;
}

function buildProps(): PropPlacement[] {
  const props: PropPlacement[] = [
    // The Concord field office the player starts in front of.
    { type: 'building', col: 18, row: 3 },
  ];

  // Trees scattered around the clearing (deliberately not a solid border -
  // there's no wall around Fernbrook, just open ground fading into
  // unimplemented content past the map edges).
  const treeSpots: Array<[number, number]> = [
    [2, 2], [5, 6], [8, 3], [3, 34], [6, 30], [10, 36],
    [14, 4], [18, 2], [22, 4], [26, 2],
    [24, 34], [20, 36], [16, 34],
    [26, 15], [26, 22],
  ];
  for (const [row, col] of treeSpots) {
    props.push({ type: 'tree', col, row });
  }

  return props;
}

export const STARTING_ZONE_GROUND: TileId[][] = buildGround();
export const STARTING_ZONE_PROPS: PropPlacement[] = buildProps();

/**
 * A trainer-battle trigger placed on the map (TODO.md "Battling" -
 * Trainer-battle type). There's no real NPC-interaction system yet (a
 * separate, not-yet-built TODO item), so this is a simple standalone
 * stand-in: a single world tile that starts a trainer battle the first
 * time the player steps onto it, deterministically (not a per-step random
 * roll like wild-encounter tall grass) - see
 * `WorldScene.maybeTriggerTrainerBattle`. Swap this for a real NPC-facing
 * interaction once that system exists.
 */
export interface TrainerPlacement {
  trainerId: TrainerId;
  col: number;
  row: number;
}

function buildTrainers(): TrainerPlacement[] {
  return [
    // Open grass well clear of the path, pond, tall-grass patches, and
    // tree footprints above.
    { trainerId: 'fernbrook_scout', col: 30, row: 24 },
  ];
}

export const STARTING_ZONE_TRAINERS: TrainerPlacement[] = buildTrainers();
