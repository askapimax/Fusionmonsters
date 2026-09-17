import Phaser from 'phaser';
import { createFounderGenome, type FounderOptions } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import { mulberry32 } from '../genetics/rng';
import type { FacingDirection } from '../data/character';
import { STAT_NAMES } from '../data/stats';
import { TYPES, type CycleTypeId } from '../data/types';
import { touchControls } from '../input/touchControls';
import { buildCreatureSVG, svgToDataUrl } from '../render/compositeSprite';
import { addToRoster } from '../state/party';
import { drawPanel, drawSlot, UI_THEME } from '../ui/panel';

const PANEL_X = 40;
const PANEL_Y = 20;
const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 440;

const SPRITE_SIZE = 110;

/**
 * TODO.md "World & Exploration" - Starter-Fusion selection flow.
 *
 * Offers a small, **fixed** (not fully random) set of founder Fusions to
 * pick exactly one from at story start, mirroring `src/data/trainers.ts`'s
 * "designed encounter" pattern: each candidate is generated from its own
 * hardcoded `mulberry32` seed plus a `forcedPrimaryType`
 * (`createFounderGenome`'s `FounderOptions`) rather than `randomSeed()`, so
 * the same three starters appear every time the game boots - reproducible
 * for testing, and a real choice between visibly/mechanically distinct
 * options rather than three random rolls that might all share a type.
 *
 * Why exactly 3, and why these types: three keeps the choice readable on
 * one screen (matches `CatalogPreviewScene`'s three-way side-by-side sprite
 * layout) without needing scrolling/paging UI that doesn't exist yet for a
 * "pick one" screen. The three primary types (`flora`, `aero`, `mineral`)
 * are spaced 3 apart around the 9-type effectiveness cycle
 * (`src/data/types.ts`'s `TYPE_CYCLE`) specifically so none of them is
 * strong/weak against either of the others (only the two nearest neighbors
 * in each direction interact) - so the pick reads as "which playstyle do
 * you want" (bulky growth / fast pressure / dense armor) rather than
 * accidentally handing the player a starter with a built-in type advantage
 * over the other two options.
 *
 * Everything else about each candidate (secondary type, parts, stats,
 * traits, moves, color) is still randomized by its seed, same as any other
 * founder - only the primary type is pinned per-candidate.
 *
 * Slots into the boot chain between `CharacterCreationScene` and
 * `WorldScene` (see `src/main.ts`): `CharacterCreationScene` now starts
 * this scene instead of `WorldScene` directly, and this scene calls
 * `addToRoster` with the chosen Fusion (which registers it into
 * `concordRegistry` itself - see `src/state/party.ts`) before starting
 * `WorldScene`. Since the roster is always empty at this point in a fresh
 * boot, `addToRoster` always succeeds here - this is the direct-call path
 * `party.ts`'s module doc comment anticipates, so its lazy
 * auto-assign-a-random-founder fallback simply never triggers anymore in
 * practice.
 *
 * UI follows the same dark-panel/monospace, D-pad-navigable precedent as
 * `CharacterCreationScene`/`StorageScene` (`src/ui/panel.ts`): Left/Right
 * (arrow keys or the D-pad) move a cursor between the three candidates
 * (wrapping, since there's no "off the end" concept with only 3 options),
 * A/Enter/Z or clicking a candidate confirms it.
 */
export class StarterSelectionScene extends Phaser.Scene {
  private candidates: Fusion[] = [];
  private selectedIndex = 0;
  private cursorGraphics!: Phaser.GameObjects.Graphics;
  private slotBounds: { x: number; y: number; width: number; height: number }[] = [];

  constructor() {
    super('StarterSelectionScene');
  }

  create(): void {
    this.candidates = STARTER_CANDIDATES.map(({ seed, options }) =>
      createFusion(createFounderGenome(mulberry32(seed), options)),
    );
    this.selectedIndex = 0;
    this.slotBounds = [];

    drawPanel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT).setDepth(200);

    this.add
      .text(PANEL_X + 24, PANEL_Y + 16, 'CHOOSE YOUR STARTER FUSION', {
        fontSize: '18px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.cursorGraphics = this.add.graphics().setDepth(201);

    const colWidth = (PANEL_WIDTH - 48) / this.candidates.length;
    this.candidates.forEach((fusion, index) => {
      const colX = PANEL_X + 24 + index * colWidth;
      this.buildCandidateColumn(fusion, colX, PANEL_Y + 60, colWidth);
    });

    this.add
      .text(PANEL_X + 24, PANEL_Y + PANEL_HEIGHT - 34, 'Left/Right to choose - A/Enter/click to confirm', {
        fontSize: '11px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
      .setDepth(201);

    this.setSelectedIndex(0);

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-LEFT', () => this.moveSelection(-1));
    keyboard.on('keydown-RIGHT', () => this.moveSelection(1));
    keyboard.on('keydown-ENTER', () => this.confirmSelection());
    keyboard.on('keydown-Z', () => this.confirmSelection());

    touchControls.onDirectionPress = (direction: FacingDirection) => {
      if (direction === 'left') this.moveSelection(-1);
      if (direction === 'right') this.moveSelection(1);
    };
    touchControls.onA = () => this.confirmSelection();
    this.events.once('shutdown', () => this.releaseTouchHandlers());
  }

  /** Renders one candidate's real composited sprite, type, a couple of stat highlights, and its blurb. */
  private buildCandidateColumn(fusion: Fusion, colX: number, colY: number, colWidth: number): void {
    const centerX = colX + colWidth / 2;
    const slotWidth = colWidth - 16;
    const slotHeight = PANEL_HEIGHT - 60 - 60;

    drawSlot(this, colX + 8, colY, slotWidth, slotHeight).setDepth(201);
    this.slotBounds.push({ x: colX + 8, y: colY, width: slotWidth, height: slotHeight });

    const spriteY = colY + 20 + SPRITE_SIZE / 2;
    this.ensureFusionTexture(fusion, (key) => {
      this.add.image(centerX, spriteY, key).setDisplaySize(SPRITE_SIZE, SPRITE_SIZE).setDepth(202);
    });

    const p = fusion.phenotype;
    const typeLabel = p.secondaryType ? `${TYPES[p.primaryType].name} / ${TYPES[p.secondaryType].name}` : TYPES[p.primaryType].name;

    this.add
      .text(centerX, spriteY + SPRITE_SIZE / 2 + 14, typeLabel, {
        fontSize: '13px',
        color: TYPES[p.primaryType].color,
        fontFamily: UI_THEME.fontFamily,
      })
      .setOrigin(0.5, 0)
      .setDepth(202);

    const statsLine = `${STAT_NAMES.hp} ${p.stats.hp} · ${STAT_NAMES.attack} ${p.stats.attack} · ${STAT_NAMES.speed} ${p.stats.speed}`;
    this.add
      .text(centerX, spriteY + SPRITE_SIZE / 2 + 36, statsLine, {
        fontSize: '11px',
        color: UI_THEME.textDim,
        fontFamily: UI_THEME.fontFamily,
      })
      .setOrigin(0.5, 0)
      .setDepth(202);

    const blurb = STARTER_CANDIDATES.find((c) => c.options.forcedPrimaryType === p.primaryType)?.blurb ?? '';
    this.add
      .text(centerX, spriteY + SPRITE_SIZE / 2 + 58, blurb, {
        fontSize: '10px',
        color: UI_THEME.text,
        fontFamily: UI_THEME.fontFamily,
        align: 'center',
        wordWrap: { width: slotWidth - 16 },
      })
      .setOrigin(0.5, 0)
      .setDepth(202);

    const zone = this.add
      .zone(centerX, colY + slotHeight / 2, slotWidth, slotHeight)
      .setInteractive({ useHandCursor: true })
      .setDepth(203);
    const index = this.slotBounds.length - 1;
    zone.on('pointerover', () => this.setSelectedIndex(index));
    zone.on('pointerdown', () => {
      this.setSelectedIndex(index);
      this.confirmSelection();
    });
  }

  /** Same `addtexture-<key>`/`addBase64` pattern as `BattleScene.ensureFusionTexture` - reused here since each candidate needs its own real rendered sprite, not just a text label. */
  private ensureFusionTexture(fusion: Fusion, onReady: (key: string) => void): void {
    const key = `starter-candidate-${fusion.genome.visualSeed}`;
    if (this.textures.exists(key)) {
      onReady(key);
      return;
    }
    this.textures.once(`addtexture-${key}`, () => onReady(key));
    const svg = buildCreatureSVG(fusion.phenotype, fusion.genome.visualSeed);
    this.textures.addBase64(key, svgToDataUrl(svg));
  }

  private setSelectedIndex(index: number): void {
    this.selectedIndex = index;
    const bounds = this.slotBounds[index];
    this.cursorGraphics.clear();
    if (bounds) {
      this.cursorGraphics.lineStyle(3, Phaser.Display.Color.HexStringToColor(UI_THEME.highlight).color, 1);
      this.cursorGraphics.strokeRoundedRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6, 8);
    }
  }

  private moveSelection(delta: number): void {
    const next = (this.selectedIndex + delta + this.candidates.length) % this.candidates.length;
    this.setSelectedIndex(next);
  }

  private confirmSelection(): void {
    const chosen = this.candidates[this.selectedIndex];
    if (!chosen) return;
    addToRoster(chosen);
    this.scene.start('WorldScene');
  }

  private releaseTouchHandlers(): void {
    touchControls.onDirectionPress = null;
    touchControls.onA = null;
  }
}

interface StarterCandidateDef {
  seed: number;
  options: FounderOptions & { forcedPrimaryType: CycleTypeId };
  blurb: string;
}

/**
 * The fixed set of starter candidates - see the class doc comment above for
 * why 3, why these types, and why fixed seeds instead of `randomSeed()`.
 */
const STARTER_CANDIDATES: StarterCandidateDef[] = [
  {
    seed: 0x51a1c001,
    options: { forcedPrimaryType: 'flora' },
    blurb: 'Growth-cycle lineage, bred from reclaimed-wetland stock.',
  },
  {
    seed: 0x51a1c002,
    options: { forcedPrimaryType: 'aero' },
    blurb: 'Pressure-line lineage, bred from the high-altitude windflow program.',
  },
  {
    seed: 0x51a1c003,
    options: { forcedPrimaryType: 'mineral' },
    blurb: 'Crystal-flat lineage, bred from the old mineral-seeding stock.',
  },
];
