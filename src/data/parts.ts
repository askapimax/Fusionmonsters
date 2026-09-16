import {
  applyOverrides,
  buildBlob,
  buildPalette,
  buildRows,
  renderPixelGrid,
  type PixelOverride,
  type PixelPalette,
  type PixelRow,
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
 * Parts are authored as small retro pixel-art sprites (via
 * src/render/pixelArt.ts) rather than smooth vector shapes, so the result
 * reads consistently with a Pokemon-like tile/sprite world later - chunky
 * flat-colored pixels with a dark outline, not curves and gradients.
 * Coordinates are local, in the same units compositeSprite.ts expects
 * (parts get translated onto shared anchor points there).
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

const PIXEL = 3;

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
// Heads - 12x13 pixel grid. Rows 0-2 are a "top decoration" zone (crest,
// horns, antenna, ...), rows 3-10 are a shared round skull, rows 11-12 are a
// "chin decoration" zone (tusks, beak).
// ---------------------------------------------------------------------------

const HEAD_COLS = 12;
const HEAD_ORIGIN = { col: 6, row: 6 };
const HEAD_BASE_WIDTHS = [0, 0, 0, 4, 6, 8, 8, 8, 8, 6, 4, 0, 0];
const HEAD_SHADING: PixelOverride[] = [
  [6, 4, 'e'],
  [6, 7, 'e'],
  [5, 7, '3'],
  [9, 4, '2'],
];

function buildHead(baseColor: string, decoration: PixelOverride[] = [], extraPalette: PixelPalette = {}): string {
  const grid = applyOverrides(buildBlob(HEAD_BASE_WIDTHS, HEAD_COLS), [...HEAD_SHADING, ...decoration]);
  return renderPixelGrid(grid, buildPalette(baseColor, extraPalette), PIXEL, HEAD_ORIGIN.col, HEAD_ORIGIN.row);
}

const HEAD_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'head_round',
    name: 'Round Skull',
    baseColor: '#c9c2a8',
    svg: buildHead('#c9c2a8'),
    rarityWeight: 12,
    statModifiers: { focus: 1 },
  },
  {
    id: 'head_crest',
    name: 'Angular Crest',
    baseColor: '#9fb8c9',
    svg: buildHead('#9fb8c9', [
      [1, 5, 'k'],
      [1, 6, 'k'],
      [2, 4, '1'],
      [2, 5, '3'],
      [2, 6, '3'],
      [2, 7, '1'],
    ]),
    rarityWeight: 10,
    statModifiers: { focus: 2, speed: -1 },
  },
  {
    id: 'head_horned',
    name: 'Horned',
    baseColor: '#b58b5a',
    svg: buildHead('#b58b5a', [
      [1, 2, 'k'],
      [2, 1, '3'],
      [2, 2, '3'],
      [1, 9, 'k'],
      [2, 9, '3'],
      [2, 10, '3'],
    ]),
    rarityWeight: 9,
    statModifiers: { attack: 2 },
  },
  {
    id: 'head_beaked',
    name: 'Beaked',
    baseColor: '#d9c04a',
    svg: buildHead(
      '#d9c04a',
      [
        [11, 5, 'b'],
        [11, 6, 'b'],
        [12, 5, 'b'],
        [12, 6, 'b'],
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
      [1, 3, 'k'],
      [2, 3, 'k'],
      [0, 3, '3'],
      [1, 8, 'k'],
      [2, 8, 'k'],
      [0, 8, '3'],
    ]),
    rarityWeight: 8,
    statModifiers: { focus: 2, resist: 1 },
  },
  {
    id: 'head_frilled',
    name: 'Frilled',
    baseColor: '#c96a8a',
    svg: buildHead('#c96a8a', [
      [2, 1, '2'],
      [3, 0, '2'],
      [2, 10, '2'],
      [3, 11, '2'],
    ]),
    rarityWeight: 6,
    statModifiers: { resist: 2, defense: -1 },
  },
  {
    id: 'head_tusked',
    name: 'Tusked',
    baseColor: '#a8a8a8',
    svg: buildHead('#a8a8a8', [
      [11, 3, 'w'],
      [12, 3, 'w'],
      [11, 8, 'w'],
      [12, 8, 'w'],
    ]),
    rarityWeight: 7,
    statModifiers: { defense: 2 },
  },
  {
    id: 'head_crystal_crown',
    name: 'Crystal Crown',
    baseColor: '#c7a8f0',
    svg: buildHead('#c7a8f0', [
      [0, 4, '3'],
      [0, 7, '3'],
      [1, 3, '3'],
      [1, 8, '3'],
      [1, 5, 'w'],
      [1, 6, 'w'],
    ]),
    rarityWeight: 4,
    statModifiers: { resist: 2, focus: 1 },
  },
];

// ---------------------------------------------------------------------------
// Bodies - 16x13 pixel grid, rows 0 and 12 reserved as padding/decoration.
// ---------------------------------------------------------------------------

const BODY_COLS = 16;
const BODY_ORIGIN = { col: 8, row: 6 };
const BODY_DEFAULT_WIDTHS = [0, 6, 10, 12, 14, 14, 14, 14, 14, 12, 10, 6, 0];

function buildBody(
  baseColor: string,
  widths: number[] = BODY_DEFAULT_WIDTHS,
  decoration: PixelOverride[] = [],
  extraPalette: PixelPalette = {},
): string {
  const grid = applyOverrides(buildBlob(widths, BODY_COLS), decoration);
  return renderPixelGrid(grid, buildPalette(baseColor, extraPalette), PIXEL, BODY_ORIGIN.col, BODY_ORIGIN.row);
}

const BODY_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'body_rounded',
    name: 'Rounded Torso',
    baseColor: '#7fb0a3',
    svg: buildBody('#7fb0a3'),
    rarityWeight: 12,
    statModifiers: { hp: 2 },
  },
  {
    id: 'body_segmented',
    name: 'Segmented Shell',
    baseColor: '#7f95b0',
    svg: buildBody('#7f95b0', BODY_DEFAULT_WIDTHS, [
      [4, 4, 'k'],
      [4, 7, 'k'],
      [4, 10, 'k'],
      [8, 4, 'k'],
      [8, 7, 'k'],
      [8, 10, 'k'],
    ]),
    rarityWeight: 9,
    statModifiers: { defense: 2 },
  },
  {
    id: 'body_slender',
    name: 'Slender Frame',
    baseColor: '#b0a37f',
    svg: buildBody('#b0a37f', [0, 3, 5, 6, 7, 7, 7, 7, 7, 6, 5, 3, 0]),
    rarityWeight: 10,
    statModifiers: { speed: 2, hp: -1 },
  },
  {
    id: 'body_armored',
    name: 'Armored Plate',
    baseColor: '#8d8d8d',
    svg: buildBody('#8d8d8d', [0, 10, 14, 14, 14, 14, 14, 14, 14, 14, 14, 10, 0], [
      [2, 2, '2'],
      [2, 13, '2'],
      [10, 2, '2'],
      [10, 13, '2'],
    ]),
    rarityWeight: 8,
    statModifiers: { defense: 3, speed: -2 },
  },
  {
    id: 'body_bulbous',
    name: 'Bulbous',
    baseColor: '#c98abf',
    svg: buildBody('#c98abf', [0, 6, 10, 13, 15, 16, 16, 16, 15, 13, 10, 6, 0]),
    rarityWeight: 10,
    statModifiers: { hp: 3 },
  },
  {
    id: 'body_ribbed',
    name: 'Ribbed',
    baseColor: '#9fb07f',
    svg: buildBody(
      '#9fb07f',
      BODY_DEFAULT_WIDTHS,
      [3, 4, 5, 6, 7, 8, 9].flatMap((row): PixelOverride[] => [
        [row, 5, 'k'],
        [row, 8, 'k'],
        [row, 11, 'k'],
      ]),
    ),
    rarityWeight: 8,
    statModifiers: { focus: 2 },
  },
  {
    id: 'body_angular',
    name: 'Angular Carapace',
    baseColor: '#b0857f',
    svg: buildBody('#b0857f', BODY_DEFAULT_WIDTHS, [
      [2, 4, 'k'],
      [2, 11, 'k'],
      [10, 4, 'k'],
      [10, 11, 'k'],
      [5, 3, 'k'],
      [7, 12, 'k'],
    ]),
    rarityWeight: 6,
    statModifiers: { defense: 2, attack: 1 },
  },
  {
    id: 'body_finback',
    name: 'Fin-Backed',
    baseColor: '#7f9db0',
    svg: buildBody('#7f9db0', BODY_DEFAULT_WIDTHS, [
      [0, 7, '2'],
      [0, 8, '2'],
    ]),
    rarityWeight: 6,
    statModifiers: { speed: 1, focus: 1 },
  },
];

// ---------------------------------------------------------------------------
// Legs - one side authored at 8x7 pixels (short and stubby, Pokemon-sprite
// proportions rather than a thin rod), then mirrored for the other leg.
// originCol is negative so the shape sits offset from center, leaving a gap
// between the mirrored pair.
// ---------------------------------------------------------------------------

const LEGS_COLS = 8;
const LEGS_ORIGIN = { col: -3, row: 0 };
const LEGS_DEFAULT_WIDTHS = [6, 6, 6, 6, 6, 6, 6];

function buildLeg(
  baseColor: string,
  widths: number[] = LEGS_DEFAULT_WIDTHS,
  decoration: PixelOverride[] = [],
  extraPalette: PixelPalette = {},
): string {
  const grid = applyOverrides(buildBlob(widths, LEGS_COLS), decoration);
  const oneLeg = renderPixelGrid(grid, buildPalette(baseColor, extraPalette), PIXEL, LEGS_ORIGIN.col, LEGS_ORIGIN.row);
  return mirror(oneLeg);
}

const LEG_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'legs_stub',
    name: 'Stub Legs',
    baseColor: '#8f8f8f',
    svg: buildLeg('#8f8f8f'),
    rarityWeight: 12,
    statModifiers: { defense: 1 },
  },
  {
    id: 'legs_digitigrade',
    name: 'Digitigrade',
    baseColor: '#a3906f',
    svg: buildLeg('#a3906f', [6, 6, 5, 5, 6, 6, 6]),
    rarityWeight: 10,
    statModifiers: { speed: 2 },
  },
  {
    id: 'legs_tentacle',
    name: 'Tentacle Base',
    baseColor: '#6f9ba3',
    svg: buildLeg('#6f9ba3', [5, 7, 5, 7, 5, 7, 5]),
    rarityWeight: 6,
    statModifiers: { resist: 1, defense: -1 },
  },
  {
    id: 'legs_clawed',
    name: 'Clawed Talons',
    baseColor: '#a35c5c',
    svg: buildLeg('#a35c5c', LEGS_DEFAULT_WIDTHS, [
      [5, 1, 'w'],
      [5, 6, 'w'],
      [6, 1, 'w'],
      [6, 6, 'w'],
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
      LEGS_DEFAULT_WIDTHS,
      [1, 2, 3, 4, 5, 6].map((col): PixelOverride => [6, col, 'h']),
      { h: '#2b2018' },
    ),
    rarityWeight: 9,
    statModifiers: { speed: 1, defense: 1 },
  },
  {
    id: 'legs_spring',
    name: 'Spring Legs',
    baseColor: '#7fa35c',
    svg: buildLeg('#7fa35c', [6, 3, 6, 3, 6, 3, 6]),
    rarityWeight: 6,
    statModifiers: { speed: 3, defense: -1 },
  },
  {
    id: 'legs_webbed',
    name: 'Webbed Paddle',
    baseColor: '#5c8fa3',
    svg: buildLeg('#5c8fa3', [6, 6, 6, 6, 6, 6, 8]),
    rarityWeight: 7,
    statModifiers: { hp: 1, speed: -1 },
  },
  {
    id: 'legs_multijoint',
    name: 'Multi-Jointed',
    baseColor: '#8f7ba3',
    svg: buildLeg('#8f7ba3', [6, 6, 5, 5, 6, 6, 5], [
      [2, 3, '2'],
      [5, 3, '2'],
    ]),
    rarityWeight: 6,
    statModifiers: { speed: 2, focus: 1 },
  },
];

// ---------------------------------------------------------------------------
// Wings - one side authored at 16x10 pixels via explicit row ranges (wings
// aren't left-right symmetric within a single side), then mirrored.
// ---------------------------------------------------------------------------

const WINGS_COLS = 16;
const WINGS_ORIGIN = { col: -1, row: 5 };

function buildWing(
  baseColor: string,
  ranges: PixelRow[],
  decoration: PixelOverride[] = [],
  extraPalette: PixelPalette = {},
): string {
  const grid = applyOverrides(buildRows(ranges, WINGS_COLS), decoration);
  const oneWing = renderPixelGrid(grid, buildPalette(baseColor, extraPalette), PIXEL, WINGS_ORIGIN.col, WINGS_ORIGIN.row);
  return mirror(oneWing);
}

const MEMBRANE_RANGES: PixelRow[] = [
  null,
  [10, 13],
  [7, 14],
  [4, 15],
  [2, 15],
  [0, 15],
  [1, 14],
  [3, 13],
  [6, 11],
  [9, 10],
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
    svg: buildWing('#6b4c7a', MEMBRANE_RANGES),
    rarityWeight: 9,
    statModifiers: { speed: 2, resist: -1 },
  },
  {
    id: 'wings_feathered',
    name: 'Feathered Wings',
    baseColor: '#a3c9e0',
    svg: buildWing('#a3c9e0', [
      null,
      [11, 13],
      [9, 14],
      [6, 15],
      [3, 15],
      [0, 15],
      [2, 14],
      [4, 13],
      [3, 12],
      [7, 11],
    ]),
    rarityWeight: 8,
    statModifiers: { speed: 2, focus: 1 },
  },
  {
    id: 'wings_insectoid',
    name: 'Insectoid Wings',
    baseColor: '#c9d96a',
    svg: buildWing('#c9d96a', [null, null, [8, 15], [5, 15], [3, 15], [2, 14], [3, 12], [5, 10], null, null]),
    rarityWeight: 7,
    statModifiers: { speed: 3, hp: -1 },
  },
  {
    id: 'wings_fin',
    name: 'Fin Wings',
    baseColor: '#5c8fa3',
    svg: buildWing('#5c8fa3', [
      null,
      null,
      null,
      null,
      [9, 13],
      [5, 15],
      [2, 15],
      [1, 14],
      [3, 11],
      [6, 9],
    ]),
    rarityWeight: 7,
    statModifiers: { resist: 1, speed: 1 },
  },
  {
    id: 'wings_crystal',
    name: 'Crystal Wings',
    baseColor: '#c7a8f0',
    svg: buildWing('#c7a8f0', MEMBRANE_RANGES, [
      [2, 10, '2'],
      [3, 9, '2'],
      [4, 8, '2'],
      [6, 7, '2'],
      [7, 6, '2'],
    ]),
    rarityWeight: 5,
    statModifiers: { resist: 2, defense: 1 },
  },
  {
    id: 'wings_tattered',
    name: 'Tattered Wings',
    baseColor: '#5a4a63',
    svg: buildWing('#5a4a63', [
      null,
      [10, 13],
      [7, 14],
      [4, 15],
      [2, 15],
      [0, 15],
      [1, 14],
      [5, 9],
      [8, 9],
      null,
    ]),
    rarityWeight: 4,
    statModifiers: { speed: 1, attack: 1 },
  },
  {
    id: 'wings_double',
    name: 'Double-Layer Wings',
    baseColor: '#8ad1c2',
    svg: buildWing(
      '#8ad1c2',
      [null, [10, 13], [7, 14], [5, 15], [2, 14], [0, 13], null, null, null, null],
      [
        [6, 2, '2'],
        [6, 3, '2'],
        [6, 4, '2'],
        [7, 3, '2'],
        [7, 4, '2'],
        [7, 5, '2'],
        [8, 4, '2'],
        [8, 5, '2'],
      ],
    ),
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
