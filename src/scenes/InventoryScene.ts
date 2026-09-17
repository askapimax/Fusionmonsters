import Phaser from 'phaser';
import { ITEMS_BY_ID } from '../data/items';
import { playerInventory } from '../state/inventory';
import { drawPanel, drawSlot, UI_THEME } from '../ui/panel';

const PANEL_X = 40;
const PANEL_Y = 30;
const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 420;

const GRID_COLS = 6;
const GRID_ROWS = 3;
const SLOT_SIZE = 72;
const SLOT_GAP = 12;

/**
 * The Bag/Inventory screen, Pokemon-style: a grid of item slots. There are
 * no items in the catalog yet (src/data/items.ts is empty), so every slot
 * renders empty - this is the real state, not a placeholder standing in
 * for a "coming soon" screen. Adding items later only needs data changes,
 * not a UI rebuild.
 */
export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('InventoryScene');
  }

  create(): void {
    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    this.add
      .text(PANEL_X + 24, PANEL_Y + 16, 'INVENTORY', {
        fontSize: '18px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.add
      .text(PANEL_X + PANEL_WIDTH - 80, PANEL_Y + 18, '[Close]', {
        fontSize: '13px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function (this: Phaser.GameObjects.Text) {
        this.setColor(UI_THEME.highlight);
      })
      .on('pointerout', function (this: Phaser.GameObjects.Text) {
        this.setColor(UI_THEME.text);
      })
      .on('pointerdown', () => this.close());

    this.buildGrid();

    const isEmpty = playerInventory.length === 0;
    if (isEmpty) {
      this.add
        .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 34, 'Empty - nothing collected yet.', {
          fontSize: '12px',
          color: UI_THEME.textDim,
          fontFamily: UI_THEME.fontFamily,
        })
        .setDepth(201);
    }

    this.input.keyboard!.on('keydown-ESC', () => this.close());
    this.input.keyboard!.on('keydown-ENTER', () => this.close());
  }

  private buildGrid(): void {
    const gridWidth = GRID_COLS * SLOT_SIZE + (GRID_COLS - 1) * SLOT_GAP;
    const startX = PANEL_X + (PANEL_WIDTH - gridWidth) / 2;
    const startY = PANEL_Y + 66;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = startX + col * (SLOT_SIZE + SLOT_GAP);
        const y = startY + row * (SLOT_SIZE + SLOT_GAP);
        drawSlot(this, x, y, SLOT_SIZE).setDepth(201);

        const entry = playerInventory[row * GRID_COLS + col];
        if (entry) {
          const item = ITEMS_BY_ID[entry.itemId];
          if (item) {
            this.add
              .text(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, item.name, {
                fontSize: '10px',
                color: UI_THEME.text,
                fontFamily: UI_THEME.fontFamily,
                align: 'center',
                wordWrap: { width: SLOT_SIZE - 8 },
              })
              .setOrigin(0.5)
              .setDepth(202);
          }
        }
      }
    }
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
