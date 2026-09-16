import type { TileId } from '../data/tiles';

/**
 * The game's first zone: "Fernbrook Outpost", a small Concord waystation at
 * the edge of the Reach. This is where a new Splicer's journey begins -
 * see README.md "Setting" / "Player's role". Layout, building placement,
 * and tall-grass patches here are a first pass, not final level design.
 */

export const ZONE_NAME = 'Fernbrook Outpost';
export const MAP_COLS = 40;
export const MAP_ROWS = 30;

export const SPAWN = { col: 20, row: 5 };

function buildStartingZone(): TileId[][] {
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

  // Border trees, boxing in this first zone.
  rect(0, 0, 0, MAP_COLS - 1, 'tree');
  rect(MAP_ROWS - 1, 0, MAP_ROWS - 1, MAP_COLS - 1, 'tree');
  rect(0, 0, MAP_ROWS - 1, 0, 'tree');
  rect(0, MAP_COLS - 1, MAP_ROWS - 1, MAP_COLS - 1, 'tree');

  // A gap in the south border - the road out of Fernbrook continues here,
  // into content that doesn't exist yet.
  set(MAP_ROWS - 1, 20, 'grass');
  set(MAP_ROWS - 1, 21, 'grass');

  // The Concord field office the player starts in front of.
  rect(3, 19, 3, 21, 'roof');
  set(4, 19, 'wall');
  set(4, 20, 'door');
  set(4, 21, 'wall');

  // The path from the field office's door down to the south gap.
  rect(5, 20, MAP_ROWS - 2, 21, 'path');

  // A signpost next to the path near spawn.
  set(6, 22, 'sign');

  // Tall-grass patches (future wild-encounter zones - not wired up yet).
  rect(10, 10, 12, 12, 'tall_grass');
  rect(15, 27, 17, 29, 'tall_grass');
  rect(20, 8, 22, 10, 'tall_grass');

  // A small pond.
  rect(8, 30, 9, 33, 'water');

  // A few flower accents in the open grass.
  set(9, 15, 'grass_flower');
  set(14, 24, 'grass_flower');
  set(18, 14, 'grass_flower');

  return map;
}

export const STARTING_ZONE_MAP: TileId[][] = buildStartingZone();
