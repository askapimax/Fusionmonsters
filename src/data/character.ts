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

/**
 * Character creation (see `src/scenes/CharacterCreationScene.ts`) offers a
 * male/female appearance choice, but there is only one real spritesheet
 * asset in `public/assets/` (the Tuxemon "adventurer" sheet above) - no
 * second appearance sprite exists to swap in. Per the README, the choice
 * is cosmetic only (no mechanical differences either way), so rather than
 * fabricate a second art asset, each appearance gets a distinct Phaser
 * tint (`sprite.setTint(...)`) applied on top of the same shared sheet: an
 * honest, low-effort stand-in for a second look until real art exists (see
 * TODO.md's "Art & Audio" section). `null` means no tint - the sheet's
 * original colors.
 */
export const APPEARANCE_TINTS: Record<'male' | 'female', number | null> = {
  male: null,
  female: 0xe8a33d,
};
