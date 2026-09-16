import { buildPalette, renderPixelGrid } from '../render/pixelArt';

/**
 * Overworld tile catalog - same pixel-art toolkit as the Fusion parts
 * (src/render/pixelArt.ts), so the world and the creatures read as one
 * consistent style. Each tile is an 8x8 pixel grid rendered at the same
 * 3-unit pixel size as Fusion parts, giving a 24x24px tile.
 */

export const TILE_SIZE = 24;

const TILE_PIXEL = 3;
const TILE_COLS = 8;
const TILE_ROWS = 8;

export type TileId =
  | 'grass'
  | 'grass_flower'
  | 'tall_grass'
  | 'path'
  | 'water'
  | 'tree'
  | 'wall'
  | 'roof'
  | 'door'
  | 'sign';

export interface TileDef {
  id: TileId;
  name: string;
  /** Blocks player movement. */
  solid: boolean;
  /** Marks a tile type as a future wild-encounter trigger zone (not wired up yet). */
  encounterZone?: boolean;
  svg: string;
}

function grid(rows: string[]): string[] {
  rows.forEach((row, i) => {
    if (row.length !== TILE_COLS) {
      throw new Error(`Tile row ${i} has length ${row.length}, expected ${TILE_COLS}: "${row}"`);
    }
  });
  if (rows.length !== TILE_ROWS) {
    throw new Error(`Tile grid has ${rows.length} rows, expected ${TILE_ROWS}`);
  }
  return rows;
}

function tileSVG(rows: string[], baseColor: string, extra: Record<string, string> = {}): string {
  const width = TILE_COLS * TILE_PIXEL;
  const height = TILE_ROWS * TILE_PIXEL;
  const body = renderPixelGrid(grid(rows), buildPalette(baseColor, extra), TILE_PIXEL, 0, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`;
}

const TILE_DEFS_LIST: TileDef[] = [
  {
    id: 'grass',
    name: 'Grass',
    solid: false,
    svg: tileSVG(
      ['11311311', '11111111', '13111131', '11111111', '11113111', '11111111', '31111113', '11111111'],
      '#4a8f3c',
    ),
  },
  {
    id: 'grass_flower',
    name: 'Flowering Grass',
    solid: false,
    svg: tileSVG(
      ['11311311', '11111111', '13111131', '111ff111', '111ff111', '11111111', '31111113', '11111111'],
      '#4a8f3c',
      { f: '#f2c6dd' },
    ),
  },
  {
    id: 'tall_grass',
    name: 'Tall Grass',
    solid: false,
    encounterZone: true,
    svg: tileSVG(
      ['31313131', '11111111', '31313131', '11111111', '31313131', '11111111', '31313131', '11111111'],
      '#2e6b2a',
    ),
  },
  {
    id: 'path',
    name: 'Dirt Path',
    solid: false,
    svg: tileSVG(
      ['11111211', '11211111', '11111112', '12111111', '11111121', '11121111', '11111112', '21111111'],
      '#a9834f',
    ),
  },
  {
    id: 'water',
    name: 'Water',
    solid: true,
    svg: tileSVG(
      ['11111111', '13311331', '11111111', '11111111', '13311331', '11111111', '11111111', '13311331'],
      '#3f7fb0',
    ),
  },
  {
    id: 'tree',
    name: 'Tree',
    solid: true,
    svg: tileSVG(
      ['11111111', '13111131', '11111111', '11311311', '11111111', '11111111', '111tt111', '111tt111'],
      '#2f6b3f',
      { t: '#5a3d24' },
    ),
  },
  {
    id: 'wall',
    name: 'Building Wall',
    solid: true,
    svg: tileSVG(
      ['11111111', 'kkkkkkkk', '11111111', '11111111', 'kkkkkkkk', '11111111', '11111111', 'kkkkkkkk'],
      '#d8c9a3',
    ),
  },
  {
    id: 'roof',
    name: 'Building Roof',
    solid: true,
    svg: tileSVG(
      ['33333333', '13333331', '11333311', '11133111', '11113111', '11111111', '11111111', 'kkkkkkkk'],
      '#8a4a3a',
    ),
  },
  {
    id: 'door',
    name: 'Building Door',
    solid: true,
    svg: tileSVG(
      ['kkkkkkkk', 'k111111k', 'k1111d1k', 'k111111k', 'k111111k', 'k111111k', 'k111111k', 'kkkkkkkk'],
      '#5a3d24',
      { d: '#e0c060' },
    ),
  },
  {
    id: 'sign',
    name: 'Signpost',
    solid: true,
    svg: tileSVG(
      ['11111111', '1bbbbbb1', '1bbbbbb1', '1bbbbbb1', '11111111', '111pp111', '111pp111', '111pp111'],
      '#4a8f3c',
      { b: '#c9b27a', p: '#7a5230' },
    ),
  },
];

export const TILES: Record<TileId, TileDef> = Object.fromEntries(
  TILE_DEFS_LIST.map((tile) => [tile.id, tile]),
) as Record<TileId, TileDef>;

export const TILE_IDS: TileId[] = TILE_DEFS_LIST.map((tile) => tile.id);
