import Phaser from 'phaser';

/**
 * Shared look for menu/UI overlays (pause menu, inventory), so they read as
 * one style rather than each screen inventing its own. Plain Phaser
 * Graphics + Text, not pixel-art sprites - these are UI chrome, not world
 * art, and the game's own HUD text already uses this same dark/light,
 * monospace look.
 */
export const UI_THEME = {
  panelFill: 0x14141c,
  panelFillAlpha: 0.96,
  border: 0xf4f0e6,
  text: '#f4f0e6',
  textDim: '#9a9aa8',
  slotFill: 0x23232e,
  slotBorder: 0x454555,
  highlight: '#8fd6bd',
  fontFamily: 'monospace',
} as const;

export function drawPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(UI_THEME.panelFill, UI_THEME.panelFillAlpha);
  graphics.fillRoundedRect(x, y, width, height, 8);
  graphics.lineStyle(2, UI_THEME.border, 1);
  graphics.strokeRoundedRect(x, y, width, height, 8);
  return graphics;
}

/** `height` defaults to `width` for the common square-slot case (item grids); pass both for a wider row (e.g. a list entry). */
export function drawSlot(scene: Phaser.Scene, x: number, y: number, width: number, height: number = width): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(UI_THEME.slotFill, 1);
  graphics.fillRoundedRect(x, y, width, height, 6);
  graphics.lineStyle(1, UI_THEME.slotBorder, 1);
  graphics.strokeRoundedRect(x, y, width, height, 6);
  return graphics;
}
