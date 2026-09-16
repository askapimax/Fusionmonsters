import { renderPixelGrid, type PixelPalette } from '../render/pixelArt';

/**
 * Placeholder player sprite - a single default look (no character creation
 * yet, per the current scope: get a character walking around the world
 * first, build appearance choices later). Same pixel-art toolkit and pixel
 * size as tiles/Fusion parts, so it reads as part of the same world.
 *
 * Only three textures are generated: down/up (front/back) and a single
 * side profile that gets mirrored for left vs. right (same trick the
 * Fusion parts use for legs/wings).
 */

const CHAR_PIXEL = 3;
export const CHAR_COLS = 10;
export const CHAR_ROWS = 14;

const CHAR_PALETTE: PixelPalette = {
  h: '#4a3626', // hair
  s: '#e0b088', // skin
  e: '#1a1a1a', // eyes
  b: '#3f7f6b', // Concord field uniform
  k: '#2a2a2a', // belt
  p: '#39506b', // pants
  f: '#2a2a2a', // shoes
};

function grid(rows: string[], label: string): string[] {
  rows.forEach((row, i) => {
    if (row.length !== CHAR_COLS) {
      throw new Error(`${label} row ${i} has length ${row.length}, expected ${CHAR_COLS}: "${row}"`);
    }
  });
  if (rows.length !== CHAR_ROWS) {
    throw new Error(`${label} has ${rows.length} rows, expected ${CHAR_ROWS}`);
  }
  return rows;
}

const BASE_ROWS = [
  '..hhhhhh..',
  '.hssssssh.',
  '.hsessesh.', // front: two eyes
  '..ssssss..',
  '..bbbbbb..',
  '.bbbbbbbb.',
  '.bbbbbbbb.',
  '.bbbbbbbb.',
  '..bbbbbb..',
  '..bkkkkb..',
  '..pp..pp..',
  '..pp..pp..',
  '..pp..pp..',
  '..ff..ff..',
];

const DOWN_ROWS = grid(BASE_ROWS, 'player-down');

const UP_ROWS = grid(
  [...BASE_ROWS.slice(0, 2), '.hssssssh.', ...BASE_ROWS.slice(3)], // back of the head: no face
  'player-up',
);

const SIDE_ROWS = grid(
  [...BASE_ROWS.slice(0, 2), '.hsssessh.', ...BASE_ROWS.slice(3)], // profile: one eye
  'player-side',
);

function characterSVG(rows: string[]): string {
  const width = CHAR_COLS * CHAR_PIXEL;
  const height = CHAR_ROWS * CHAR_PIXEL;
  const body = renderPixelGrid(rows, CHAR_PALETTE, CHAR_PIXEL, 0, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`;
}

export const CHARACTER_SPRITES: Record<'down' | 'up' | 'side', string> = {
  down: characterSVG(DOWN_ROWS),
  up: characterSVG(UP_ROWS),
  side: characterSVG(SIDE_ROWS),
};
