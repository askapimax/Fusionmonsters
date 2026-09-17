import Phaser from 'phaser';
import { PARTS_BY_ID } from '../data/parts';
import { TYPES } from '../data/types';
import type { RegistryEntry } from '../genetics/registry';
import { touchControls } from '../input/touchControls';
import { concordRegistry } from '../state/registry';
import { drawPanel, drawSlot, UI_THEME } from '../ui/panel';

const PANEL_X = 40;
const PANEL_Y = 30;
const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 420;

const LIST_START_Y = PANEL_Y + 78;
const ROW_HEIGHT = 58;
const ROW_GAP = 8;
const ROWS_VISIBLE = 5;
const ROW_WIDTH = PANEL_WIDTH - 48;

const PART_CATEGORIES = ['head', 'body', 'legs', 'wings'] as const;

/**
 * The Concord registry screen (see README "The Concord registry" and
 * TODO.md's "Concord registry UI" item): browses every distinct Fusion
 * signature (type + parts + traits + moves combination - see
 * src/genetics/registry.ts) discovered so far, whether from a wild
 * encounter (src/scenes/WorldScene.ts) or the player's own Fusion
 * (src/state/party.ts). Both register into the single app-wide instance in
 * src/state/registry.ts.
 *
 * Same dark-panel/monospace UI language as InventoryScene
 * (src/ui/panel.ts's `drawPanel`/`drawSlot`/`UI_THEME`) and the same
 * open/close conventions, but a scrollable list of rows rather than a
 * grid of slots - a log of discoveries reads better as rows than as an
 * item-bag grid. The combinatorial signature space is enormous by design
 * (see README), so there's no "X of Y possible" - just the running
 * discovered count, same spirit as InventoryScene's real-but-currently-
 * empty state.
 */
export class ConcordRegistryScene extends Phaser.Scene {
  private entries: RegistryEntry[] = [];
  private scrollOffset = 0;
  private rowGraphics: Phaser.GameObjects.Graphics[] = [];
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private scrollHint!: Phaser.GameObjects.Text;

  constructor() {
    super('ConcordRegistryScene');
  }

  create(): void {
    this.entries = concordRegistry.list();
    this.scrollOffset = 0;

    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    this.add
      .text(PANEL_X + 24, PANEL_Y + 16, 'CONCORD REGISTRY', {
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

    this.add
      .text(
        PANEL_X + 24,
        PANEL_Y + 42,
        `${this.entries.length} signature${this.entries.length === 1 ? '' : 's'} discovered`,
        { fontSize: '12px', color: UI_THEME.textDim, fontFamily: UI_THEME.fontFamily },
      )
      .setDepth(201);

    this.scrollHint = this.add
      .text(PANEL_X + PANEL_WIDTH - 24, PANEL_Y + 42, '', {
        fontSize: '11px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
      .setOrigin(1, 0)
      .setDepth(201);

    if (this.entries.length === 0) {
      this.add
        .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 34, 'Empty - nothing collected yet.', {
          fontSize: '12px',
          color: UI_THEME.textDim,
          fontFamily: UI_THEME.fontFamily,
        })
        .setDepth(201);
    }

    this.renderRows();

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-UP', () => this.scroll(-1));
    keyboard.on('keydown-DOWN', () => this.scroll(1));
    keyboard.on('keydown-ESC', () => this.close());
    keyboard.on('keydown-ENTER', () => this.close());
    keyboard.on('keydown-X', () => this.close());

    // Up/Down scroll the list (D-pad or arrow keys, same edge-triggered
    // convention PauseMenuScene uses for its cursor); B/Esc/X/Enter all
    // close, matching InventoryScene exactly - there's nothing to
    // "confirm" here, just browse and back out.
    touchControls.onDirectionPress = (direction) => {
      if (direction === 'up') this.scroll(-1);
      if (direction === 'down') this.scroll(1);
    };
    touchControls.onB = () => this.close();
    this.events.once('shutdown', () => {
      touchControls.onDirectionPress = null;
      touchControls.onB = null;
    });
  }

  private maxScrollOffset(): number {
    return Math.max(0, this.entries.length - ROWS_VISIBLE);
  }

  private scroll(delta: number): void {
    const next = Phaser.Math.Clamp(this.scrollOffset + delta, 0, this.maxScrollOffset());
    if (next === this.scrollOffset) return;
    this.scrollOffset = next;
    this.renderRows();
  }

  private renderRows(): void {
    this.rowGraphics.forEach((g) => g.destroy());
    this.rowGraphics = [];
    this.rowTexts.forEach((t) => t.destroy());
    this.rowTexts = [];

    const visible = this.entries.slice(this.scrollOffset, this.scrollOffset + ROWS_VISIBLE);
    visible.forEach((entry, i) => {
      const y = LIST_START_Y + i * (ROW_HEIGHT + ROW_GAP);
      this.rowGraphics.push(drawSlot(this, PANEL_X + 24, y, ROW_WIDTH, ROW_HEIGHT).setDepth(201));

      const p = entry.phenotype;
      const typeLabel = p.secondaryType
        ? `${TYPES[p.primaryType].name} / ${TYPES[p.secondaryType].name}`
        : TYPES[p.primaryType].name;
      const partsLabel = PART_CATEGORIES.map(
        (category) => PARTS_BY_ID[p.parts[category]]?.name ?? p.parts[category],
      ).join(' · ');
      const timesLabel = entry.timesDiscovered === 1 ? 'seen once' : `seen x${entry.timesDiscovered}`;

      this.rowTexts.push(
        this.add
          .text(PANEL_X + 36, y + 8, typeLabel, {
            fontSize: '13px',
            color: UI_THEME.text,
            fontFamily: UI_THEME.fontFamily,
          })
          .setDepth(202),
        this.add
          .text(PANEL_X + 24 + ROW_WIDTH - 12, y + 8, timesLabel, {
            fontSize: '11px',
            color: UI_THEME.highlight,
            fontFamily: UI_THEME.fontFamily,
          })
          .setOrigin(1, 0)
          .setDepth(202),
        this.add
          .text(PANEL_X + 36, y + 28, partsLabel, {
            fontSize: '10px',
            color: UI_THEME.textDim,
            fontFamily: UI_THEME.fontFamily,
            wordWrap: { width: ROW_WIDTH - 24 },
          })
          .setDepth(202),
      );
    });

    if (this.entries.length > ROWS_VISIBLE) {
      const from = this.scrollOffset + 1;
      const to = Math.min(this.entries.length, this.scrollOffset + ROWS_VISIBLE);
      this.scrollHint.setText(`${from}-${to} of ${this.entries.length} (Up/Down to scroll)`);
    } else {
      this.scrollHint.setText('');
    }
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
