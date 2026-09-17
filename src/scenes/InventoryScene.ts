import Phaser from 'phaser';
import type { FacingDirection } from '../data/character';
import { ITEMS_BY_ID } from '../data/items';
import { touchControls } from '../input/touchControls';
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
 * The Bag/Inventory screen, Pokemon-style: a grid of item slots, now
 * populated from a real (if small) starting kit (src/data/items.ts,
 * src/state/inventory.ts). Navigable the same way the pause menu is
 * (src/scenes/PauseMenuScene.ts), adapted to two dimensions: Up/Down/
 * Left/Right (arrow keys or the D-pad, edge-triggered so one press moves
 * one slot) move a highlighted cursor between grid cells, clamping at the
 * grid's edges rather than wrapping (a Pokemon-style bag grid stops at the
 * last column/row instead of jumping to the opposite side - that's the
 * deliberate choice here, unlike the pause menu's single-column wrap).
 * A/Enter/Z confirms the highlighted slot; since there's no "use item"
 * system in battle or the overworld yet, confirming just shows the
 * selected item's name + description in the panel, like a real Pokemon
 * bag's info line, rather than pretending to consume it. Mouse/touch
 * hover over a slot also moves the cursor there, same as the pause menu.
 * B/Esc/X backs out and closes the screen.
 */
export class InventoryScene extends Phaser.Scene {
  private slotBounds: { x: number; y: number }[] = [];
  private cursorGraphics!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private emptyText?: Phaser.GameObjects.Text;
  private selectedIndex = 0;

  constructor() {
    super('InventoryScene');
  }

  create(): void {
    this.slotBounds = [];
    this.selectedIndex = 0;

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

    this.infoText = this.add
      .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 34, '', {
        fontSize: '12px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
        wordWrap: { width: PANEL_WIDTH - 48 },
      })
      .setDepth(201);

    this.cursorGraphics = this.add.graphics().setDepth(203);

    this.buildGrid();
    this.updateEmptyState();
    this.setSelectedIndex(0);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-UP', () => this.moveSelection(0, -1));
    keyboard.on('keydown-DOWN', () => this.moveSelection(0, 1));
    keyboard.on('keydown-LEFT', () => this.moveSelection(-1, 0));
    keyboard.on('keydown-RIGHT', () => this.moveSelection(1, 0));
    keyboard.on('keydown-ENTER', () => this.confirmSelection());
    keyboard.on('keydown-Z', () => this.confirmSelection());
    keyboard.on('keydown-ESC', () => this.close());
    keyboard.on('keydown-X', () => this.close());

    touchControls.onDirectionPress = (direction: FacingDirection) => {
      if (direction === 'up') this.moveSelection(0, -1);
      if (direction === 'down') this.moveSelection(0, 1);
      if (direction === 'left') this.moveSelection(-1, 0);
      if (direction === 'right') this.moveSelection(1, 0);
    };
    touchControls.onA = () => this.confirmSelection();
    touchControls.onB = () => this.close();
    this.events.once('shutdown', () => this.releaseTouchHandlers());
  }

  private buildGrid(): void {
    const gridWidth = GRID_COLS * SLOT_SIZE + (GRID_COLS - 1) * SLOT_GAP;
    const startX = PANEL_X + (PANEL_WIDTH - gridWidth) / 2;
    const startY = PANEL_Y + 66;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = startX + col * (SLOT_SIZE + SLOT_GAP);
        const y = startY + row * (SLOT_SIZE + SLOT_GAP);
        const index = row * GRID_COLS + col;
        this.slotBounds[index] = { x, y };

        drawSlot(this, x, y, SLOT_SIZE).setDepth(201);

        const entry = playerInventory[index];
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

            if (entry.quantity > 1) {
              this.add
                .text(x + SLOT_SIZE - 6, y + SLOT_SIZE - 4, `x${entry.quantity}`, {
                  fontSize: '10px',
                  color: UI_THEME.textDim,
                  fontFamily: UI_THEME.fontFamily,
                })
                .setOrigin(1, 1)
                .setDepth(202);
            }
          }
        }

        // An invisible interactive zone over the slot: hovering it moves the
        // keyboard/D-pad cursor here too (mirrors PauseMenuScene's
        // pointerover-selects-the-option behavior), clicking it selects AND
        // confirms in one step (mirrors PauseMenuScene's pointerdown).
        this.add
          .zone(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE)
          .setInteractive({ useHandCursor: true })
          .setDepth(204)
          .on('pointerover', () => this.setSelectedIndex(index))
          .on('pointerdown', () => {
            this.setSelectedIndex(index);
            this.confirmSelection();
          });
      }
    }
  }

  private setSelectedIndex(index: number): void {
    this.selectedIndex = index;
    const bounds = this.slotBounds[index];
    this.cursorGraphics.clear();
    if (bounds) {
      this.cursorGraphics.lineStyle(3, Phaser.Display.Color.HexStringToColor(UI_THEME.highlight).color, 1);
      this.cursorGraphics.strokeRoundedRect(bounds.x - 2, bounds.y - 2, SLOT_SIZE + 4, SLOT_SIZE + 4, 8);
    }
  }

  /** Moves the cursor by (dx, dy) grid cells, clamped at the grid's edges (no wrap). */
  private moveSelection(dx: number, dy: number): void {
    const col = this.selectedIndex % GRID_COLS;
    const row = Math.floor(this.selectedIndex / GRID_COLS);
    const nextCol = Phaser.Math.Clamp(col + dx, 0, GRID_COLS - 1);
    const nextRow = Phaser.Math.Clamp(row + dy, 0, GRID_ROWS - 1);
    this.setSelectedIndex(nextRow * GRID_COLS + nextCol);
  }

  private confirmSelection(): void {
    const entry = playerInventory[this.selectedIndex];
    if (!entry) {
      this.infoText.setText('');
      return;
    }
    const item = ITEMS_BY_ID[entry.itemId];
    if (!item) {
      this.infoText.setText('');
      return;
    }
    this.infoText.setText(`${item.name}: ${item.description}`);
  }

  private updateEmptyState(): void {
    this.emptyText?.destroy();
    this.emptyText = undefined;
    if (playerInventory.length === 0) {
      this.emptyText = this.add
        .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 34, 'Empty - nothing collected yet.', {
          fontSize: '12px',
          color: UI_THEME.textDim,
          fontFamily: UI_THEME.fontFamily,
        })
        .setDepth(201);
    }
  }

  private releaseTouchHandlers(): void {
    touchControls.onDirectionPress = null;
    touchControls.onA = null;
    touchControls.onB = null;
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
