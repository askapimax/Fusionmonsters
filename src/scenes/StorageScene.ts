import Phaser from 'phaser';
import { PARTS_BY_ID } from '../data/parts';
import { TYPES } from '../data/types';
import type { FacingDirection } from '../data/character';
import type { Fusion } from '../genetics/fusion';
import { touchControls } from '../input/touchControls';
import { addToRoster, getRoster, MAX_ROSTER_SIZE } from '../state/party';
import { getStorage, withdrawFromStorage } from '../state/storage';
import { drawPanel, drawSlot, UI_THEME } from '../ui/panel';

const PANEL_X = 40;
const PANEL_Y = 30;
const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 420;

const GRID_COLS = 6;
const GRID_ROWS = 3;
const SLOT_SIZE = 72;
const SLOT_GAP = 12;

/** Short "Type / Type" label for a slot, same convention as ConcordRegistryScene. */
function typeLabel(fusion: Fusion): string {
  const p = fusion.phenotype;
  return p.secondaryType ? `${TYPES[p.primaryType].name} / ${TYPES[p.secondaryType].name}` : TYPES[p.primaryType].name;
}

/** Fuller one-line description for the info bar: name/nickname, type, and its four parts. */
function describeFusion(fusion: Fusion): string {
  const p = fusion.phenotype;
  const parts = (['head', 'body', 'legs', 'wings'] as const)
    .map((category) => PARTS_BY_ID[p.parts[category]]?.name ?? p.parts[category])
    .join(' · ');
  const name = fusion.nickname ?? typeLabel(fusion);
  return `${name} (${typeLabel(fusion)}): ${parts}`;
}

/**
 * The Fusion storage ("box") screen (TODO.md "Breeding UI & Progression" -
 * Fusion storage system): browses Fusions kept in `src/state/storage.ts`
 * beyond the 6-slot active roster, in the same dark-panel/monospace grid
 * style as `InventoryScene` (`src/ui/panel.ts`'s `drawPanel`/`drawSlot`/
 * `UI_THEME`), reusing its exact D-pad-navigable grid-cursor pattern:
 * Up/Down/Left/Right (arrow keys or the D-pad, edge-triggered, clamped not
 * wrapped) move a highlighted cursor, A/Enter/Z confirms, B/Esc/X closes.
 *
 * Scoped deliberately narrow per the TODO item: this is a *browse and
 * withdraw* screen, not a full two-way roster<->storage manager (there's no
 * roster-browsing UI at all yet to pair it with - see `party.ts`). A/Enter
 * on a stored Fusion attempts to withdraw it straight into the active
 * roster via `addToRoster` (mirroring `party.ts`'s existing "false when
 * full" contract): if the roster has room, the Fusion moves from storage
 * into the roster (at full HP - see `addToRoster`) and disappears from this
 * grid; if the roster is already at `MAX_ROSTER_SIZE`, the Fusion stays put
 * in storage and the info bar explains why, rather than silently losing it.
 *
 * There's no *deposit* path reachable from this screen (or anywhere else
 * yet - no capture/breeding/hatching-overflow UI calls
 * `depositToStorage` in production, only this module's own demo seed does -
 * see `storage.ts`). Whoever wires deposit-on-roster-full into
 * capture/breeding/hatching later should call `depositToStorage` directly
 * from that flow; this screen doesn't need to change for it.
 */
export class StorageScene extends Phaser.Scene {
  private slotBounds: { x: number; y: number }[] = [];
  private cursorGraphics!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;
  private emptyText?: Phaser.GameObjects.Text;
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private slotGraphics: Phaser.GameObjects.Graphics[] = [];
  private slotZones: Phaser.GameObjects.Zone[] = [];
  private selectedIndex = 0;

  constructor() {
    super('StorageScene');
  }

  create(): void {
    this.slotBounds = [];
    this.selectedIndex = 0;

    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    this.add
      .text(PANEL_X + 24, PANEL_Y + 16, 'STORAGE', {
        fontSize: '18px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.countText = this.add
      .text(PANEL_X + PANEL_WIDTH - 80, PANEL_Y + 18, '', {
        fontSize: '11px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
      .setOrigin(1, 0)
      .setDepth(201);

    this.add
      .text(PANEL_X + 24, PANEL_Y + 40, '[Close]', {
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

    this.rebuildGrid();
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

  /** (Re)draws the slot grid from current storage state - called on create and after every withdrawal. */
  private rebuildGrid(): void {
    this.slotGraphics.forEach((g) => g.destroy());
    this.slotGraphics = [];
    this.slotLabels.forEach((t) => t.destroy());
    this.slotLabels = [];
    this.slotZones.forEach((z) => z.destroy());
    this.slotZones = [];
    this.slotBounds = [];

    const storage = getStorage();
    this.countText.setText(`${storage.length} stored · roster ${getRoster().length}/${MAX_ROSTER_SIZE}`);

    const gridWidth = GRID_COLS * SLOT_SIZE + (GRID_COLS - 1) * SLOT_GAP;
    const startX = PANEL_X + (PANEL_WIDTH - gridWidth) / 2;
    const startY = PANEL_Y + 76;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = startX + col * (SLOT_SIZE + SLOT_GAP);
        const y = startY + row * (SLOT_SIZE + SLOT_GAP);
        const index = row * GRID_COLS + col;
        this.slotBounds[index] = { x, y };

        this.slotGraphics.push(drawSlot(this, x, y, SLOT_SIZE).setDepth(201));

        const fusion = storage[index];
        if (fusion) {
          this.slotLabels.push(
            this.add
              .text(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, typeLabel(fusion), {
                fontSize: '10px',
                color: UI_THEME.text,
                fontFamily: UI_THEME.fontFamily,
                align: 'center',
                wordWrap: { width: SLOT_SIZE - 8 },
              })
              .setOrigin(0.5)
              .setDepth(202),
          );
        }

        this.slotZones.push(
          this.add
            .zone(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE)
            .setInteractive({ useHandCursor: true })
            .setDepth(204)
            .on('pointerover', () => this.setSelectedIndex(index))
            .on('pointerdown', () => {
              this.setSelectedIndex(index);
              this.confirmSelection();
            }),
        );
      }
    }

    this.updateEmptyState(storage.length);
    // Keep the cursor visible over whatever's left after a withdrawal.
    this.setSelectedIndex(Math.min(this.selectedIndex, GRID_COLS * GRID_ROWS - 1));
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

  /** Moves the cursor by (dx, dy) grid cells, clamped at the grid's edges (no wrap) - same as InventoryScene. */
  private moveSelection(dx: number, dy: number): void {
    const col = this.selectedIndex % GRID_COLS;
    const row = Math.floor(this.selectedIndex / GRID_COLS);
    const nextCol = Phaser.Math.Clamp(col + dx, 0, GRID_COLS - 1);
    const nextRow = Phaser.Math.Clamp(row + dy, 0, GRID_ROWS - 1);
    this.setSelectedIndex(nextRow * GRID_COLS + nextCol);
  }

  /**
   * Attempts to withdraw the highlighted stored Fusion into the active
   * roster. Checks roster space *before* removing it from storage, so a
   * full roster never loses the Fusion in either state.
   */
  private confirmSelection(): void {
    const fusion = getStorage()[this.selectedIndex];
    if (!fusion) {
      this.infoText.setText('');
      return;
    }

    if (getRoster().length >= MAX_ROSTER_SIZE) {
      this.infoText.setText(`${describeFusion(fusion)}\nRoster is full (${MAX_ROSTER_SIZE}/${MAX_ROSTER_SIZE}) - free a slot to withdraw it.`);
      return;
    }

    const withdrawn = withdrawFromStorage(this.selectedIndex);
    if (!withdrawn) {
      this.infoText.setText('');
      return;
    }
    addToRoster(withdrawn);
    this.infoText.setText(`${describeFusion(withdrawn)}\nWithdrawn to roster!`);
    this.rebuildGrid();
  }

  private updateEmptyState(count: number): void {
    this.emptyText?.destroy();
    this.emptyText = undefined;
    if (count === 0) {
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
