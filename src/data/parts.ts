import {
  applyOverrides,
  buildPalette,
  buildSilhouette,
  renderPixelGrid,
  type Ellipse,
  type PixelOverride,
  type PixelPalette,
} from '../render/pixelArt';
import type { StatKey } from './stats';

/**
 * Procedural body-part catalog. Each Fusion is composited from one part per
 * category (head / body / legs / wings), and each part is itself an
 * inheritable allele - see src/genetics/breeding.ts. There is no freeform
 * art generation: the "procedural" creature is a recombination of this
 * fixed library, plus a small per-individual cosmetic jitter applied at
 * render time (see src/render/compositeSprite.ts).
 *
 * Parts are authored as a handful of overlapping ellipses (see
 * src/render/pixelArt.ts) rather than hand-typed pixel grids - that gives
 * smooth, rounded silhouettes with automatic outlining/shading, closer to
 * the real pixel art used for the world and character (public/assets/)
 * than the original blocky placeholder version was.
 */

export type PartCategory = 'head' | 'body' | 'legs' | 'wings';

export interface PartDef {
  id: string;
  category: PartCategory;
  name: string;
  svg: string;
  dominanceRank: number;
  /** Relative likelihood of being picked for a wild founder or a mutation roll. */
  rarityWeight: number;
  statModifiers: Partial<Record<StatKey, number>>;
  baseColor: string;
}

const PIXEL = 2;

function mirror(oneSide: string): string {
  return `${oneSide}<g transform="scale(-1,1)">${oneSide}</g>`;
}

function withRanks(category: PartCategory, entries: Omit<PartDef, 'category' | 'dominanceRank'>[]): PartDef[] {
  return entries.map((entry, index) => ({
    ...entry,
    category,
    dominanceRank: entries.length - index,
  }));
}

// ---------------------------------------------------------------------------
// Heads - 18x22 grid. The skull ellipse is shared by every variant; rows
// 0-5 above it and 20-21 below are headroom for crests/horns/antennae and
// beaks/tusks respectively.
// ---------------------------------------------------------------------------

const HEAD_COLS = 18;
const HEAD_ROWS = 22;
const HEAD_ORIGIN = { col: 9, row: 12 };
const SKULL: Ellipse = { cx: 9, cy: 12, rx: 7, ry: 7 };
const HEAD_EYES: PixelOverride[] = [
  [11, 6, 'e'],
  [11, 12, 'e'],
];

function buildHead(baseColor: string, shapes: Ellipse[], decoration: PixelOverride[] = [], extraPalette: PixelPalette = {}): string {
  const grid = applyOverrides(buildSilhouette(shapes, HEAD_COLS, HEAD_ROWS), [...HEAD_EYES, ...decoration]);
  return renderPixelGrid(grid, buildPalette(baseColor, extraPalette), PIXEL, HEAD_ORIGIN.col, HEAD_ORIGIN.row);
}

const HEAD_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'head_round',
    name: 'Round Skull',
    baseColor: '#c9c2a8',
    svg: buildHead('#c9c2a8', [SKULL]),
    rarityWeight: 12,
    statModifiers: { focus: 1 },
  },
  {
    id: 'head_crest',
    name: 'Angular Crest',
    baseColor: '#9fb8c9',
    svg: buildHead('#9fb8c9', [SKULL, { cx: 9, cy: 4, rx: 2.2, ry: 4.5 }]),
    rarityWeight: 10,
    statModifiers: { focus: 2, speed: -1 },
  },
  {
    id: 'head_horned',
    name: 'Horned',
    baseColor: '#b58b5a',
    svg: buildHead('#b58b5a', [SKULL, { cx: 3, cy: 7, rx: 1.6, ry: 3.2 }, { cx: 15, cy: 7, rx: 1.6, ry: 3.2 }]),
    rarityWeight: 9,
    statModifiers: { attack: 2 },
  },
  {
    id: 'head_beaked',
    name: 'Beaked',
    baseColor: '#d9c04a',
    svg: buildHead(
      '#d9c04a',
      [SKULL],
      [
        [19, 8, 'b'],
        [19, 9, 'b'],
        [20, 8, 'b'],
        [20, 9, 'b'],
        [21, 8, 'b'],
        [21, 9, 'b'],
      ],
      { b: '#a8791a' },
    ),
    rarityWeight: 9,
    statModifiers: { speed: 1, focus: 1 },
  },
  {
    id: 'head_antenna',
    name: 'Antenna Dome',
    baseColor: '#8ad1c2',
    svg: buildHead('#8ad1c2', [
      SKULL,
      { cx: 5, cy: 3, rx: 1, ry: 3.5 },
      { cx: 13, cy: 3, rx: 1, ry: 3.5 },
      { cx: 5, cy: 0.5, rx: 1.3, ry: 1.3 },
      { cx: 13, cy: 0.5, rx: 1.3, ry: 1.3 },
    ]),
    rarityWeight: 8,
    statModifiers: { focus: 2, resist: 1 },
  },
  {
    id: 'head_frilled',
    name: 'Frilled',
    baseColor: '#c96a8a',
    svg: buildHead('#c96a8a', [
      SKULL,
      { cx: 0.5, cy: 9, rx: 1.5, ry: 2 },
      { cx: 0.5, cy: 13, rx: 1.5, ry: 2 },
      { cx: 17.5, cy: 9, rx: 1.5, ry: 2 },
      { cx: 17.5, cy: 13, rx: 1.5, ry: 2 },
    ]),
    rarityWeight: 6,
    statModifiers: { resist: 2, defense: -1 },
  },
  {
    id: 'head_tusked',
    name: 'Tusked',
    baseColor: '#a8a8a8',
    svg: buildHead(
      '#a8a8a8',
      [SKULL],
      [
        [17, 3, 'w'],
        [18, 3, 'w'],
        [19, 4, 'w'],
        [17, 14, 'w'],
        [18, 14, 'w'],
        [19, 13, 'w'],
      ],
    ),
    rarityWeight: 7,
    statModifiers: { defense: 2 },
  },
  {
    id: 'head_crystal_crown',
    name: 'Crystal Crown',
    baseColor: '#c7a8f0',
    svg: buildHead(
      '#c7a8f0',
      [SKULL, { cx: 9, cy: 3, rx: 1.8, ry: 2 }, { cx: 4.5, cy: 5, rx: 1.3, ry: 1.5 }, { cx: 13.5, cy: 5, rx: 1.3, ry: 1.5 }],
      [
        [2, 9, 'w'],
        [4, 4, 'w'],
        [4, 13, 'w'],
      ],
    ),
    rarityWeight: 4,
    statModifiers: { resist: 2, focus: 1 },
  },
];

// ---------------------------------------------------------------------------
// Bodies - 24x20 grid, torso ellipse shared by every variant.
// ---------------------------------------------------------------------------

const BODY_COLS = 24;
const BODY_ROWS = 20;
const BODY_ORIGIN = { col: 12, row: 10 };
const TORSO: Ellipse = { cx: 12, cy: 10, rx: 10, ry: 9 };

function buildBody(baseColor: string, shapes: Ellipse[], decoration: PixelOverride[] = [], extraPalette: PixelPalette = {}): string {
  const grid = applyOverrides(buildSilhouette(shapes, BODY_COLS, BODY_ROWS), decoration);
  return renderPixelGrid(grid, buildPalette(baseColor, extraPalette), PIXEL, BODY_ORIGIN.col, BODY_ORIGIN.row);
}

const BODY_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'body_rounded',
    name: 'Rounded Torso',
    baseColor: '#7fb0a3',
    svg: buildBody('#7fb0a3', [TORSO]),
    rarityWeight: 12,
    statModifiers: { hp: 2 },
  },
  {
    id: 'body_segmented',
    name: 'Segmented Shell',
    baseColor: '#7f95b0',
    svg: buildBody(
      '#7f95b0',
      [TORSO],
      [6, 12, 18].flatMap((col): PixelOverride[] => [
        [6, col, 'k'],
        [14, col, 'k'],
      ]),
    ),
    rarityWeight: 9,
    statModifiers: { defense: 2 },
  },
  {
    id: 'body_slender',
    name: 'Slender Frame',
    baseColor: '#b0a37f',
    svg: buildBody('#b0a37f', [{ cx: 12, cy: 10, rx: 6.5, ry: 9.5 }]),
    rarityWeight: 10,
    statModifiers: { speed: 2, hp: -1 },
  },
  {
    id: 'body_armored',
    name: 'Armored Plate',
    baseColor: '#8d8d8d',
    svg: buildBody(
      '#8d8d8d',
      [{ cx: 12, cy: 10, rx: 11, ry: 8 }],
      [
        [3, 3, '2'],
        [3, 20, '2'],
        [16, 3, '2'],
        [16, 20, '2'],
      ],
    ),
    rarityWeight: 8,
    statModifiers: { defense: 3, speed: -2 },
  },
  {
    id: 'body_bulbous',
    name: 'Bulbous',
    baseColor: '#c98abf',
    svg: buildBody('#c98abf', [{ cx: 12, cy: 10, rx: 11.5, ry: 10 }]),
    rarityWeight: 10,
    statModifiers: { hp: 3 },
  },
  {
    id: 'body_ribbed',
    name: 'Ribbed',
    baseColor: '#9fb07f',
    svg: buildBody(
      '#9fb07f',
      [TORSO],
      [4, 6, 8, 10, 12, 14, 16].flatMap((row): PixelOverride[] => [
        [row, 8, 'k'],
        [row, 12, 'k'],
        [row, 16, 'k'],
      ]),
    ),
    rarityWeight: 8,
    statModifiers: { focus: 2 },
  },
  {
    id: 'body_angular',
    name: 'Angular Carapace',
    baseColor: '#b0857f',
    svg: buildBody(
      '#b0857f',
      [TORSO],
      [
        [4, 6, 'k'],
        [4, 18, 'k'],
        [16, 6, 'k'],
        [16, 18, 'k'],
        [10, 3, 'k'],
        [10, 21, 'k'],
      ],
    ),
    rarityWeight: 6,
    statModifiers: { defense: 2, attack: 1 },
  },
  {
    id: 'body_finback',
    name: 'Fin-Backed',
    baseColor: '#7f9db0',
    svg: buildBody('#7f9db0', [TORSO, { cx: 12, cy: 1, rx: 1.8, ry: 2.5 }]),
    rarityWeight: 6,
    statModifiers: { speed: 1, focus: 1 },
  },
];

// ---------------------------------------------------------------------------
// Legs - one side authored at 12x11, then mirrored for the other leg.
// originCol is negative so the shape sits offset from center, leaving a gap
// between the mirrored pair.
// ---------------------------------------------------------------------------

const LEGS_COLS = 12;
const LEGS_ROWS = 11;
const LEGS_ORIGIN = { col: -4, row: 0 };
const LEG_BASE: Ellipse[] = [{ cx: 6, cy: 5, rx: 3.3, ry: 5 }];

function buildLeg(baseColor: string, shapes: Ellipse[], decoration: PixelOverride[] = [], extraPalette: PixelPalette = {}): string {
  const grid = applyOverrides(buildSilhouette(shapes, LEGS_COLS, LEGS_ROWS), decoration);
  const oneLeg = renderPixelGrid(grid, buildPalette(baseColor, extraPalette), PIXEL, LEGS_ORIGIN.col, LEGS_ORIGIN.row);
  return mirror(oneLeg);
}

const LEG_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'legs_stub',
    name: 'Stub Legs',
    baseColor: '#8f8f8f',
    svg: buildLeg('#8f8f8f', LEG_BASE),
    rarityWeight: 12,
    statModifiers: { defense: 1 },
  },
  {
    id: 'legs_digitigrade',
    name: 'Digitigrade',
    baseColor: '#a3906f',
    svg: buildLeg('#a3906f', [
      { cx: 6, cy: 3, rx: 3, ry: 3.2 },
      { cx: 6.8, cy: 8, rx: 2.4, ry: 3 },
    ]),
    rarityWeight: 10,
    statModifiers: { speed: 2 },
  },
  {
    id: 'legs_tentacle',
    name: 'Tentacle Base',
    baseColor: '#6f9ba3',
    svg: buildLeg('#6f9ba3', [
      { cx: 5, cy: 2, rx: 2.3, ry: 2.3 },
      { cx: 7, cy: 5, rx: 2.1, ry: 2.3 },
      { cx: 5, cy: 8.5, rx: 2.1, ry: 2.3 },
    ]),
    rarityWeight: 6,
    statModifiers: { resist: 1, defense: -1 },
  },
  {
    id: 'legs_clawed',
    name: 'Clawed Talons',
    baseColor: '#a35c5c',
    svg: buildLeg('#a35c5c', LEG_BASE, [
      [9, 4, 'w'],
      [10, 4, 'w'],
      [9, 6, 'w'],
      [10, 6, 'w'],
      [9, 8, 'w'],
      [10, 8, 'w'],
    ]),
    rarityWeight: 8,
    statModifiers: { attack: 2, speed: 1 },
  },
  {
    id: 'legs_hooved',
    name: 'Hooved',
    baseColor: '#8f7256',
    svg: buildLeg(
      '#8f7256',
      LEG_BASE,
      [3, 4, 5, 6, 7, 8, 9].flatMap((col): PixelOverride[] => [
        [9, col, 'h'],
        [10, col, 'h'],
      ]),
      { h: '#2b2018' },
    ),
    rarityWeight: 9,
    statModifiers: { speed: 1, defense: 1 },
  },
  {
    id: 'legs_spring',
    name: 'Spring Legs',
    baseColor: '#7fa35c',
    svg: buildLeg('#7fa35c', [
      { cx: 6, cy: 1.5, rx: 2.5, ry: 1.8 },
      { cx: 5, cy: 4, rx: 2, ry: 1.6 },
      { cx: 7, cy: 6.5, rx: 2, ry: 1.6 },
      { cx: 5.5, cy: 9, rx: 2, ry: 1.8 },
    ]),
    rarityWeight: 6,
    statModifiers: { speed: 3, defense: -1 },
  },
  {
    id: 'legs_webbed',
    name: 'Webbed Paddle',
    baseColor: '#5c8fa3',
    svg: buildLeg('#5c8fa3', [
      { cx: 6, cy: 3, rx: 2.1, ry: 3 },
      { cx: 6, cy: 8, rx: 4, ry: 2.6 },
    ]),
    rarityWeight: 7,
    statModifiers: { hp: 1, speed: -1 },
  },
  {
    id: 'legs_multijoint',
    name: 'Multi-Jointed',
    baseColor: '#8f7ba3',
    svg: buildLeg('#8f7ba3', [
      { cx: 6, cy: 2, rx: 2.8, ry: 2.2 },
      { cx: 6.5, cy: 5.5, rx: 2.4, ry: 2 },
      { cx: 6, cy: 9, rx: 2.6, ry: 2.2 },
    ]),
    rarityWeight: 6,
    statModifiers: { speed: 2, focus: 1 },
  },
];

// ---------------------------------------------------------------------------
// Wings - one side authored at 24x15 from a root->tip sweep of overlapping
// ellipses, then mirrored for the other wing.
// ---------------------------------------------------------------------------

const WINGS_COLS = 24;
const WINGS_ROWS = 15;
const WINGS_ORIGIN = { col: -2, row: 7 };

function buildWing(baseColor: string, shapes: Ellipse[], decoration: PixelOverride[] = [], extraPalette: PixelPalette = {}): string {
  const grid = applyOverrides(buildSilhouette(shapes, WINGS_COLS, WINGS_ROWS), decoration);
  const oneWing = renderPixelGrid(grid, buildPalette(baseColor, extraPalette), PIXEL, WINGS_ORIGIN.col, WINGS_ORIGIN.row);
  return mirror(oneWing);
}

const MEMBRANE_SWEEP: Ellipse[] = [
  { cx: 2, cy: 7, rx: 3, ry: 6 },
  { cx: 10, cy: 5.5, rx: 6.5, ry: 4.5 },
  { cx: 18, cy: 3.5, rx: 4, ry: 2.3 },
];

const WING_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'wings_none',
    name: 'Vestigial (None)',
    baseColor: '#000000',
    svg: '',
    rarityWeight: 14,
    statModifiers: {},
  },
  {
    id: 'wings_membrane',
    name: 'Membrane Wings',
    baseColor: '#6b4c7a',
    svg: buildWing('#6b4c7a', MEMBRANE_SWEEP),
    rarityWeight: 9,
    statModifiers: { speed: 2, resist: -1 },
  },
  {
    id: 'wings_feathered',
    name: 'Feathered Wings',
    baseColor: '#a3c9e0',
    svg: buildWing(
      '#a3c9e0',
      [
        { cx: 2, cy: 7, rx: 3, ry: 6 },
        { cx: 9, cy: 6, rx: 6, ry: 5 },
        { cx: 17, cy: 4.5, rx: 3.5, ry: 2.8 },
      ],
      [10, 14, 18].flatMap((col): PixelOverride[] => [[7, col, 'k']]),
    ),
    rarityWeight: 8,
    statModifiers: { speed: 2, focus: 1 },
  },
  {
    id: 'wings_insectoid',
    name: 'Insectoid Wings',
    baseColor: '#c9d96a',
    svg: buildWing('#c9d96a', [
      { cx: 3, cy: 7, rx: 2.5, ry: 4 },
      { cx: 10, cy: 6, rx: 5, ry: 2.5 },
      { cx: 16, cy: 5, rx: 3, ry: 1.3 },
    ]),
    rarityWeight: 7,
    statModifiers: { speed: 3, hp: -1 },
  },
  {
    id: 'wings_fin',
    name: 'Fin Wings',
    baseColor: '#5c8fa3',
    svg: buildWing('#5c8fa3', [
      { cx: 2, cy: 9, rx: 2.8, ry: 4.5 },
      { cx: 9, cy: 8, rx: 5.5, ry: 3.2 },
      { cx: 15, cy: 7, rx: 3.2, ry: 1.8 },
    ]),
    rarityWeight: 7,
    statModifiers: { resist: 1, speed: 1 },
  },
  {
    id: 'wings_crystal',
    name: 'Crystal Wings',
    baseColor: '#c7a8f0',
    svg: buildWing(
      '#c7a8f0',
      MEMBRANE_SWEEP,
      [
        [4, 6, 'w'],
        [3, 11, 'w'],
        [3, 16, 'w'],
      ],
    ),
    rarityWeight: 5,
    statModifiers: { resist: 2, defense: 1 },
  },
  {
    id: 'wings_tattered',
    name: 'Tattered Wings',
    baseColor: '#5a4a63',
    svg: buildWing('#5a4a63', [
      { cx: 2, cy: 7, rx: 3, ry: 6 },
      { cx: 9, cy: 6, rx: 5.5, ry: 4.2 },
      { cx: 14, cy: 4.5, rx: 2, ry: 1.5 },
    ]),
    rarityWeight: 4,
    statModifiers: { speed: 1, attack: 1 },
  },
  {
    id: 'wings_double',
    name: 'Double-Layer Wings',
    baseColor: '#8ad1c2',
    svg: buildWing('#8ad1c2', [
      { cx: 2, cy: 4, rx: 2.5, ry: 3 },
      { cx: 9, cy: 3, rx: 5, ry: 2.5 },
      { cx: 14, cy: 2, rx: 2.5, ry: 1.5 },
      { cx: 2, cy: 11, rx: 2.2, ry: 2.8 },
      { cx: 8, cy: 10, rx: 4, ry: 2.2 },
      { cx: 12, cy: 9, rx: 2, ry: 1.3 },
    ]),
    rarityWeight: 4,
    statModifiers: { speed: 2, resist: 1 },
  },
];

export const HEAD_PARTS = withRanks('head', HEAD_ENTRIES);
export const BODY_PARTS = withRanks('body', BODY_ENTRIES);
export const LEGS_PARTS = withRanks('legs', LEG_ENTRIES);
export const WING_PARTS = withRanks('wings', WING_ENTRIES);

export const PARTS_BY_CATEGORY: Record<PartCategory, PartDef[]> = {
  head: HEAD_PARTS,
  body: BODY_PARTS,
  legs: LEGS_PARTS,
  wings: WING_PARTS,
};

export const ALL_PARTS: PartDef[] = [...HEAD_PARTS, ...BODY_PARTS, ...LEGS_PARTS, ...WING_PARTS];

export const PARTS_BY_ID: Record<string, PartDef> = Object.fromEntries(
  ALL_PARTS.map((part) => [part.id, part]),
);
