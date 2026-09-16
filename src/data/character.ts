/**
 * Placeholder player character - a single default look (no character
 * creation yet). Real pixel-art spritesheet from the Tuxemon project
 * ("adventurer" overworld sheet) - see public/assets/CREDITS.md for
 * source/license (CC BY-SA 4.0).
 *
 * Sheet layout: 4 rows (down, left, right, up) x 3 columns
 * (walk1, idle, walk2), 16x32 per frame.
 */

export const CHARACTER_TEXTURE_KEY = 'player-adventurer';
export const CHARACTER_SHEET_URL = 'assets/sprites/adventurer.png';
export const CHAR_FRAME_WIDTH = 16;
export const CHAR_FRAME_HEIGHT = 32;

export type FacingDirection = 'down' | 'left' | 'right' | 'up';

export interface FacingFrames {
  idle: number;
  walk1: number;
  walk2: number;
}

const ROW_BASE: Record<FacingDirection, number> = {
  down: 0,
  left: 3,
  right: 6,
  up: 9,
};

export const FACING_FRAMES: Record<FacingDirection, FacingFrames> = Object.fromEntries(
  Object.entries(ROW_BASE).map(([direction, base]) => [
    direction,
    { walk1: base, idle: base + 1, walk2: base + 2 },
  ]),
) as Record<FacingDirection, FacingFrames>;
