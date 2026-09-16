/**
 * Overworld ground-tile catalog. Unlike the procedurally-generated Fusion
 * parts, these are real pixel-art tiles (16x16, classic GBA-Pokemon scale)
 * cropped from the Tuxemon project's "Basic Buch Tiles" sheet - see
 * public/assets/CREDITS.md for the exact source and license (CC BY-SA 4.0).
 */

export const TILE_SIZE = 16;

export type TileId = 'grass' | 'tall_grass' | 'path' | 'water';

export interface TileDef {
  id: TileId;
  name: string;
  /** Blocks player movement. */
  solid: boolean;
  /** Marks a tile type as a future wild-encounter trigger zone (not wired up yet). */
  encounterZone?: boolean;
  textureKey: string;
  url: string;
}

const TILE_LIST: TileDef[] = [
  {
    id: 'grass',
    name: 'Grass',
    solid: false,
    textureKey: 'tile-grass',
    url: 'assets/tiles/grass.png',
  },
  {
    id: 'tall_grass',
    name: 'Tall Grass',
    solid: false,
    encounterZone: true,
    textureKey: 'tile-tall_grass',
    url: 'assets/tiles/tall_grass.png',
  },
  {
    id: 'path',
    name: 'Dirt Path',
    solid: false,
    textureKey: 'tile-path',
    url: 'assets/tiles/path.png',
  },
  {
    id: 'water',
    name: 'Water',
    solid: true,
    textureKey: 'tile-water',
    url: 'assets/tiles/water.png',
  },
];

export const TILES: Record<TileId, TileDef> = Object.fromEntries(
  TILE_LIST.map((tile) => [tile.id, tile]),
) as Record<TileId, TileDef>;

export const TILE_IDS: TileId[] = TILE_LIST.map((tile) => tile.id);
