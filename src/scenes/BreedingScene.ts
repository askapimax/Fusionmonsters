import Phaser from 'phaser';
import { PARTS_BY_ID } from '../data/parts';
import { TYPES } from '../data/types';
import type { FacingDirection } from '../data/character';
import { breed } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import { mulberry32, randomSeed } from '../genetics/rng';
import { touchControls } from '../input/touchControls';
import { addToRoster, getRoster } from '../state/party';
import { concordRegistry } from '../state/registry';
import { depositToStorage, getStorage } from '../state/storage';
import { drawPanel, drawSlot, UI_THEME } from '../ui/panel';

const PANEL_X = 40;
const PANEL_Y = 30;
const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 420;

const GRID_COLS = 6;
const GRID_ROWS = 3;
const SLOT_SIZE = 72;
const SLOT_GAP = 12;

type PoolSource = 'Roster' | 'Storage';

interface PoolEntry {
  fusion: Fusion;
  source: PoolSource;
}

type Phase = 'pickA' | 'pickB' | 'result';

/** Short "Type / Type" label for a slot, same convention as StorageScene/ConcordRegistryScene. */
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
 * The in-game breeding screen (TODO.md "Breeding UI & Progression" - In-game
 * breeding UI): lets the player pick two distinct Fusions from the combined
 * roster + storage pool as parents, then calls the existing, already-tested
 * `breed()` engine (`src/genetics/breeding.ts`) to produce an offspring
 * genome and `createFusion()` (`src/genetics/fusion.ts`) to derive its
 * phenotype. Same dark-panel/monospace grid style as `StorageScene`
 * (`src/ui/panel.ts`'s `drawPanel`/`drawSlot`/`UI_THEME`), reusing its exact
 * D-pad grid-cursor conventions (Up/Down/Left/Right move a clamped, not
 * wrapped, cursor; A/Enter/Z confirms; B/Esc/X backs out).
 *
 * Deliberately does NOT implement:
 * - Breeding-group/role compatibility gating. README's "same breeding
 *   group, opposite or compatible breeding roles" is aspirational
 *   design-fiction text describing an ambition, not a rule `breed()` (or
 *   any other code) actually enforces - `breed(parentA, parentB, rng,
 *   options)` accepts any two genomes unconditionally. This screen matches
 *   that: any two *distinct* Fusions from the combined pool can be bred.
 * - A real egg/hatch-timer mechanism. That is its own, separate TODO item
 *   ("Egg/hatching flow") directly below this one. Scoped honestly here:
 *   breeding immediately produces a hatched Fusion - the result text says
 *   "was born" / "added to your roster/storage", never "an egg was laid" or
 *   anything implying a hatch timer exists.
 *
 * Two-step pick flow: `phase` starts at `'pickA'` (browsing the combined
 * pool), confirming locks in Parent A and moves to `'pickB'` (the same pool,
 * now excluding Parent A from being re-picked - you can't breed a Fusion
 * with itself), confirming a *different* entry there breeds the two and
 * moves to `'result'`, where confirming again resets back to `'pickA'` so
 * the player can keep breeding (the newly-born Fusion is now part of the
 * pool too). B/Esc/X during `'pickB'` backs out to `'pickA'` (unlocking
 * Parent A) rather than closing the whole screen; during `'pickA'` or
 * `'result'` it closes the screen.
 */
export class BreedingScene extends Phaser.Scene {
  private pool: PoolEntry[] = [];
  private slotBounds: { x: number; y: number }[] = [];
  private cursorGraphics!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;
  private emptyText?: Phaser.GameObjects.Text;
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private slotGraphics: Phaser.GameObjects.Graphics[] = [];
  private slotZones: Phaser.GameObjects.Zone[] = [];
  private selectedIndex = 0;
  private phase: Phase = 'pickA';
  private parentAIndex: number | null = null;

  constructor() {
    super('BreedingScene');
  }

  create(): void {
    this.selectedIndex = 0;
    this.phase = 'pickA';
    this.parentAIndex = null;

    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    this.add
      .text(PANEL_X + 24, PANEL_Y + 16, 'BREED', {
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

    this.statusText = this.add
      .text(PANEL_X + 24, PANEL_Y + 58, '', {
        fontSize: '12px',
        color: UI_THEME.highlight,
        fontFamily: UI_THEME.fontFamily,
        wordWrap: { width: PANEL_WIDTH - 48 },
      })
      .setDepth(201);

    this.infoText = this.add
      .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 34, '', {
        fontSize: '12px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
        wordWrap: { width: PANEL_WIDTH - 48 },
      })
      .setDepth(201);

    this.cursorGraphics = this.add.graphics().setDepth(203);

    this.rebuildPool();
    this.updateStatusText();
    this.rebuildGrid();
    this.setSelectedIndex(0);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-UP', () => this.moveSelection(0, -1));
    keyboard.on('keydown-DOWN', () => this.moveSelection(0, 1));
    keyboard.on('keydown-LEFT', () => this.moveSelection(-1, 0));
    keyboard.on('keydown-RIGHT', () => this.moveSelection(1, 0));
    keyboard.on('keydown-ENTER', () => this.confirmSelection());
    keyboard.on('keydown-Z', () => this.confirmSelection());
    keyboard.on('keydown-ESC', () => this.handleBack());
    keyboard.on('keydown-X', () => this.handleBack());

    touchControls.onDirectionPress = (direction: FacingDirection) => {
      if (direction === 'up') this.moveSelection(0, -1);
      if (direction === 'down') this.moveSelection(0, 1);
      if (direction === 'left') this.moveSelection(-1, 0);
      if (direction === 'right') this.moveSelection(1, 0);
    };
    touchControls.onA = () => this.confirmSelection();
    touchControls.onB = () => this.handleBack();
    this.events.once('shutdown', () => this.releaseTouchHandlers());
  }

  /** Rebuilds the combined roster + storage pool from current state - called on create and after every breed. */
  private rebuildPool(): void {
    this.pool = [
      ...getRoster().map((slot): PoolEntry => ({ fusion: slot.fusion, source: 'Roster' })),
      ...getStorage().map((fusion): PoolEntry => ({ fusion, source: 'Storage' })),
    ];
    this.countText.setText(`${this.pool.length} available`);
  }

  /** (Re)draws the slot grid from the current pool - called on create, after picking Parent A, and after a breed. */
  private rebuildGrid(): void {
    this.slotGraphics.forEach((g) => g.destroy());
    this.slotGraphics = [];
    this.slotLabels.forEach((t) => t.destroy());
    this.slotLabels = [];
    this.slotZones.forEach((z) => z.destroy());
    this.slotZones = [];
    this.slotBounds = [];

    const gridWidth = GRID_COLS * SLOT_SIZE + (GRID_COLS - 1) * SLOT_GAP;
    const startX = PANEL_X + (PANEL_WIDTH - gridWidth) / 2;
    const startY = PANEL_Y + 92;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = startX + col * (SLOT_SIZE + SLOT_GAP);
        const y = startY + row * (SLOT_SIZE + SLOT_GAP);
        const index = row * GRID_COLS + col;
        this.slotBounds[index] = { x, y };

        this.slotGraphics.push(drawSlot(this, x, y, SLOT_SIZE).setDepth(201));

        const entry = this.pool[index];
        if (entry) {
          const isParentA = this.phase === 'pickB' && index === this.parentAIndex;
          const label = `${entry.source}${isParentA ? ' [A]' : ''}\n${typeLabel(entry.fusion)}`;
          this.slotLabels.push(
            this.add
              .text(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, label, {
                fontSize: '10px',
                color: isParentA ? UI_THEME.highlight : UI_THEME.text,
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

    this.updateEmptyState();
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
    const entry = this.pool[index];
    this.infoText.setText(entry ? describeFusion(entry.fusion) : '');
  }

  /** Moves the cursor by (dx, dy) grid cells, clamped at the grid's edges (no wrap) - same as StorageScene/InventoryScene. */
  private moveSelection(dx: number, dy: number): void {
    const col = this.selectedIndex % GRID_COLS;
    const row = Math.floor(this.selectedIndex / GRID_COLS);
    const nextCol = Phaser.Math.Clamp(col + dx, 0, GRID_COLS - 1);
    const nextRow = Phaser.Math.Clamp(row + dy, 0, GRID_ROWS - 1);
    this.setSelectedIndex(nextRow * GRID_COLS + nextCol);
  }

  private updateStatusText(): void {
    if (this.phase === 'pickA') {
      this.statusText.setText(
        this.pool.length < 2
          ? 'Need at least two Fusions (roster + storage combined) to breed.'
          : 'Pick the first parent.',
      );
    } else if (this.phase === 'pickB') {
      const parentA = this.parentAIndex !== null ? this.pool[this.parentAIndex] : undefined;
      this.statusText.setText(
        parentA
          ? `Parent A: ${typeLabel(parentA.fusion)} (${parentA.source}). Now pick Parent B - not the same Fusion.`
          : 'Pick the second parent.',
      );
    }
  }

  private confirmSelection(): void {
    if (this.phase === 'result') {
      // Start a fresh breeding round - the pool may now include the Fusion
      // just born, so rebuild it before browsing again.
      this.phase = 'pickA';
      this.parentAIndex = null;
      this.rebuildPool();
      this.updateStatusText();
      this.rebuildGrid();
      return;
    }

    if (this.pool.length < 2) {
      return;
    }

    const entry = this.pool[this.selectedIndex];
    if (!entry) {
      return;
    }

    if (this.phase === 'pickA') {
      this.parentAIndex = this.selectedIndex;
      this.phase = 'pickB';
      this.updateStatusText();
      this.rebuildGrid();
      return;
    }

    // phase === 'pickB'
    if (this.selectedIndex === this.parentAIndex) {
      this.statusText.setText("Can't breed a Fusion with itself - pick a different one for Parent B.");
      return;
    }

    const parentAEntry = this.pool[this.parentAIndex!];
    const parentBEntry = entry;
    this.breedAndResolve(parentAEntry.fusion, parentBEntry.fusion);
  }

  /**
   * Breeds the two chosen parents' genomes via the existing, tested
   * `breed()` engine and derives the offspring's phenotype via
   * `createFusion()`. Per the TODO item, registers the offspring into
   * `concordRegistry`. Scope note (see class doc comment): this produces an
   * already-hatched Fusion, not an egg with a hatch timer - that's separate,
   * not-yet-built work. Mirrors `BattleScene.attemptSampleKit`'s roster-full
   * fallback: `addToRoster` first, `depositToStorage` if the roster is full.
   */
  private breedAndResolve(parentA: Fusion, parentB: Fusion): void {
    const rng = mulberry32(randomSeed());
    const offspringGenome = breed(parentA.genome, parentB.genome, rng, {});
    const offspring = createFusion(offspringGenome);
    concordRegistry.register(offspring.genome, offspring.phenotype);

    const addedToRoster = addToRoster(offspring);
    if (!addedToRoster) {
      depositToStorage(offspring);
    }
    const destination = addedToRoster ? 'roster' : 'storage (roster is full)';

    this.phase = 'result';
    this.statusText.setText(`${describeFusion(offspring)} was born! Added to your ${destination}.`);
    this.infoText.setText('A/Enter to breed again · B/Esc to close.');
    this.rebuildPool();
    this.rebuildGrid();
  }

  private updateEmptyState(): void {
    this.emptyText?.destroy();
    this.emptyText = undefined;
    if (this.pool.length === 0) {
      this.emptyText = this.add
        .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 34, 'Nothing to breed with yet.', {
          fontSize: '12px',
          color: UI_THEME.textDim,
          fontFamily: UI_THEME.fontFamily,
        })
        .setDepth(201);
    }
  }

  private handleBack(): void {
    if (this.phase === 'pickB') {
      this.phase = 'pickA';
      this.parentAIndex = null;
      this.updateStatusText();
      this.rebuildGrid();
      return;
    }
    this.close();
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
