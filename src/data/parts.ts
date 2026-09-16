import type { StatKey } from './stats';

/**
 * Procedural body-part catalog. Each Fusion is composited from one part per
 * category (head / body / legs / wings), and each part is itself an
 * inheritable allele - see src/genetics/breeding.ts. There is no freeform
 * art generation: the "procedural" creature is a recombination of this
 * fixed library, plus a small per-individual cosmetic jitter applied at
 * render time (see src/render/compositeSprite.ts).
 *
 * SVG fragments are authored in local coordinates around (0,0) and get
 * translated onto the shared anchor points defined in compositeSprite.ts.
 * `mirror` draws one side of a paired part (legs/wings) and adds a
 * horizontally-flipped copy, so only one side needs to be hand-authored.
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

const HEAD_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'head_round',
    name: 'Round Skull',
    baseColor: '#c9c2a8',
    svg: '<circle cx="0" cy="0" r="14" fill="#c9c2a8"/><circle cx="-5" cy="-2" r="2" fill="#141414"/><circle cx="5" cy="-2" r="2" fill="#141414"/>',
    rarityWeight: 12,
    statModifiers: { focus: 1 },
  },
  {
    id: 'head_crest',
    name: 'Angular Crest',
    baseColor: '#9fb8c9',
    svg: '<path d="M-13,4 L0,-24 L13,4 Z" fill="#9fb8c9"/><circle cx="-4" cy="4" r="2" fill="#141414"/><circle cx="4" cy="4" r="2" fill="#141414"/>',
    rarityWeight: 10,
    statModifiers: { focus: 2, speed: -1 },
  },
  {
    id: 'head_horned',
    name: 'Horned',
    baseColor: '#b58b5a',
    svg: '<circle cx="0" cy="0" r="13" fill="#b58b5a"/><path d="M-11,-8 L-18,-24 L-4,-12 Z" fill="#e5d9bf"/><path d="M11,-8 L18,-24 L4,-12 Z" fill="#e5d9bf"/><circle cx="-5" cy="-1" r="2" fill="#141414"/><circle cx="5" cy="-1" r="2" fill="#141414"/>',
    rarityWeight: 9,
    statModifiers: { attack: 2 },
  },
  {
    id: 'head_beaked',
    name: 'Beaked',
    baseColor: '#d9c04a',
    svg: '<circle cx="0" cy="-2" r="13" fill="#d9c04a"/><path d="M-7,6 L0,22 L7,6 Z" fill="#a8791a"/><circle cx="-5" cy="-4" r="2" fill="#141414"/><circle cx="5" cy="-4" r="2" fill="#141414"/>',
    rarityWeight: 9,
    statModifiers: { speed: 1, focus: 1 },
  },
  {
    id: 'head_antenna',
    name: 'Antenna Dome',
    baseColor: '#8ad1c2',
    svg: '<ellipse cx="0" cy="0" rx="12" ry="14" fill="#8ad1c2"/><line x1="-6" y1="-12" x2="-12" y2="-26" stroke="#3f6f64" stroke-width="2"/><line x1="6" y1="-12" x2="12" y2="-26" stroke="#3f6f64" stroke-width="2"/><circle cx="-12" cy="-27" r="2.5" fill="#3f6f64"/><circle cx="12" cy="-27" r="2.5" fill="#3f6f64"/><circle cx="-5" cy="-1" r="2" fill="#141414"/><circle cx="5" cy="-1" r="2" fill="#141414"/>',
    rarityWeight: 8,
    statModifiers: { focus: 2, resist: 1 },
  },
  {
    id: 'head_frilled',
    name: 'Frilled',
    baseColor: '#c96a8a',
    svg: '<path d="M-16,-2 L-24,-16 L-14,-8 Z" fill="#c96a8a"/><path d="M0,-6 L0,-22 L6,-8 Z" fill="#c96a8a"/><path d="M16,-2 L24,-16 L14,-8 Z" fill="#c96a8a"/><circle cx="0" cy="0" r="13" fill="#c96a8a"/><circle cx="-5" cy="-2" r="2" fill="#141414"/><circle cx="5" cy="-2" r="2" fill="#141414"/>',
    rarityWeight: 6,
    statModifiers: { resist: 2, defense: -1 },
  },
  {
    id: 'head_tusked',
    name: 'Tusked',
    baseColor: '#a8a8a8',
    svg: '<circle cx="0" cy="0" r="13" fill="#a8a8a8"/><path d="M-9,7 Q-14,16 -8,20 L-6,10 Z" fill="#f2f2f2"/><path d="M9,7 Q14,16 8,20 L6,10 Z" fill="#f2f2f2"/><circle cx="-5" cy="-2" r="2" fill="#141414"/><circle cx="5" cy="-2" r="2" fill="#141414"/>',
    rarityWeight: 7,
    statModifiers: { defense: 2 },
  },
  {
    id: 'head_crystal_crown',
    name: 'Crystal Crown',
    baseColor: '#c7a8f0',
    svg: '<circle cx="0" cy="0" r="13" fill="#c7a8f0"/><rect x="-3" y="-24" width="6" height="6" transform="rotate(45 0 -21)" fill="#e9dcff"/><rect x="-11" y="-19" width="5" height="5" transform="rotate(45 -8.5 -16.5)" fill="#e9dcff"/><rect x="6" y="-19" width="5" height="5" transform="rotate(45 8.5 -16.5)" fill="#e9dcff"/><circle cx="-5" cy="-2" r="2" fill="#141414"/><circle cx="5" cy="-2" r="2" fill="#141414"/>',
    rarityWeight: 4,
    statModifiers: { resist: 2, focus: 1 },
  },
];

const BODY_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'body_rounded',
    name: 'Rounded Torso',
    baseColor: '#7fb0a3',
    svg: '<ellipse cx="0" cy="0" rx="28" ry="24" fill="#7fb0a3"/>',
    rarityWeight: 12,
    statModifiers: { hp: 2 },
  },
  {
    id: 'body_segmented',
    name: 'Segmented Shell',
    baseColor: '#7f95b0',
    svg: '<ellipse cx="0" cy="0" rx="26" ry="22" fill="#7f95b0"/><path d="M-24,-6 Q0,-14 24,-6" stroke="#4c5f78" stroke-width="1.5" fill="none"/><path d="M-24,6 Q0,14 24,6" stroke="#4c5f78" stroke-width="1.5" fill="none"/>',
    rarityWeight: 9,
    statModifiers: { defense: 2 },
  },
  {
    id: 'body_slender',
    name: 'Slender Frame',
    baseColor: '#b0a37f',
    svg: '<ellipse cx="0" cy="0" rx="16" ry="30" fill="#b0a37f"/>',
    rarityWeight: 10,
    statModifiers: { speed: 2, hp: -1 },
  },
  {
    id: 'body_armored',
    name: 'Armored Plate',
    baseColor: '#8d8d8d',
    svg: '<rect x="-26" y="-20" width="52" height="40" rx="10" fill="#8d8d8d"/>',
    rarityWeight: 8,
    statModifiers: { defense: 3, speed: -2 },
  },
  {
    id: 'body_bulbous',
    name: 'Bulbous',
    baseColor: '#c98abf',
    svg: '<circle cx="0" cy="0" r="26" fill="#c98abf"/>',
    rarityWeight: 10,
    statModifiers: { hp: 3 },
  },
  {
    id: 'body_ribbed',
    name: 'Ribbed',
    baseColor: '#9fb07f',
    svg: '<ellipse cx="0" cy="0" rx="26" ry="22" fill="#9fb07f"/><line x1="-10" y1="-18" x2="-10" y2="18" stroke="#5d6b47" stroke-width="1.5"/><line x1="0" y1="-20" x2="0" y2="20" stroke="#5d6b47" stroke-width="1.5"/><line x1="10" y1="-18" x2="10" y2="18" stroke="#5d6b47" stroke-width="1.5"/>',
    rarityWeight: 8,
    statModifiers: { focus: 2 },
  },
  {
    id: 'body_angular',
    name: 'Angular Carapace',
    baseColor: '#b0857f',
    svg: '<polygon points="0,-26 22,-13 22,13 0,26 -22,13 -22,-13" fill="#b0857f"/>',
    rarityWeight: 6,
    statModifiers: { defense: 2, attack: 1 },
  },
  {
    id: 'body_finback',
    name: 'Fin-Backed',
    baseColor: '#7f9db0',
    svg: '<ellipse cx="0" cy="0" rx="26" ry="22" fill="#7f9db0"/><path d="M-6,-20 L6,-20 L0,-38 Z" fill="#5c7c8f"/>',
    rarityWeight: 6,
    statModifiers: { speed: 1, focus: 1 },
  },
];

const LEG_ENTRIES: Omit<PartDef, 'category' | 'dominanceRank'>[] = [
  {
    id: 'legs_stub',
    name: 'Stub Legs',
    baseColor: '#8f8f8f',
    svg: mirror('<rect x="6" y="0" width="11" height="18" rx="4" fill="#8f8f8f"/>'),
    rarityWeight: 12,
    statModifiers: { defense: 1 },
  },
  {
    id: 'legs_digitigrade',
    name: 'Digitigrade',
    baseColor: '#a3906f',
    svg: mirror('<path d="M10,0 L14,12 L10,26" stroke="#a3906f" stroke-width="6" fill="none" stroke-linecap="round"/>'),
    rarityWeight: 10,
    statModifiers: { speed: 2 },
  },
  {
    id: 'legs_tentacle',
    name: 'Tentacle Base',
    baseColor: '#6f9ba3',
    svg: mirror('<path d="M10,0 Q4,12 10,22 Q16,30 10,38" stroke="#6f9ba3" stroke-width="6" fill="none" stroke-linecap="round"/>'),
    rarityWeight: 6,
    statModifiers: { resist: 1, defense: -1 },
  },
  {
    id: 'legs_clawed',
    name: 'Clawed Talons',
    baseColor: '#a35c5c',
    svg: mirror('<rect x="6" y="0" width="9" height="20" rx="3" fill="#a35c5c"/><path d="M6,20 L2,28 M10,20 L10,29 M15,20 L19,28" stroke="#3a1f1f" stroke-width="2" fill="none"/>'),
    rarityWeight: 8,
    statModifiers: { attack: 2, speed: 1 },
  },
  {
    id: 'legs_hooved',
    name: 'Hooved',
    baseColor: '#8f7256',
    svg: mirror('<rect x="7" y="0" width="8" height="20" fill="#8f7256"/><rect x="5" y="20" width="12" height="6" rx="2" fill="#2b2018"/>'),
    rarityWeight: 9,
    statModifiers: { speed: 1, defense: 1 },
  },
  {
    id: 'legs_spring',
    name: 'Spring Legs',
    baseColor: '#7fa35c',
    svg: mirror('<path d="M10,0 L16,6 L6,12 L16,18 L6,24 L12,30" stroke="#7fa35c" stroke-width="4" fill="none" stroke-linecap="round"/>'),
    rarityWeight: 6,
    statModifiers: { speed: 3, defense: -1 },
  },
  {
    id: 'legs_webbed',
    name: 'Webbed Paddle',
    baseColor: '#5c8fa3',
    svg: mirror('<rect x="7" y="0" width="8" height="18" fill="#5c8fa3"/><path d="M4,18 L18,18 L20,26 L11,23 L2,26 Z" fill="#5c8fa3"/>'),
    rarityWeight: 7,
    statModifiers: { hp: 1, speed: -1 },
  },
  {
    id: 'legs_multijoint',
    name: 'Multi-Jointed',
    baseColor: '#8f7ba3',
    svg: mirror('<path d="M10,0 L16,10 L8,18 L14,28" stroke="#8f7ba3" stroke-width="5" fill="none" stroke-linecap="round"/>'),
    rarityWeight: 6,
    statModifiers: { speed: 2, focus: 1 },
  },
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
    svg: mirror('<path d="M14,0 L46,-8 L40,10 L48,20 L20,22 Z" fill="#6b4c7a"/>'),
    rarityWeight: 9,
    statModifiers: { speed: 2, resist: -1 },
  },
  {
    id: 'wings_feathered',
    name: 'Feathered Wings',
    baseColor: '#a3c9e0',
    svg: mirror('<path d="M14,-2 L40,-14 L34,0 L42,4 L30,8 L36,16 L18,18 Z" fill="#a3c9e0"/>'),
    rarityWeight: 8,
    statModifiers: { speed: 2, focus: 1 },
  },
  {
    id: 'wings_insectoid',
    name: 'Insectoid Wings',
    baseColor: '#c9d96a',
    svg: mirror('<ellipse cx="30" cy="-4" rx="20" ry="9" fill="#c9d96a" opacity="0.85" transform="rotate(-18 30 -4)"/>'),
    rarityWeight: 7,
    statModifiers: { speed: 3, hp: -1 },
  },
  {
    id: 'wings_fin',
    name: 'Fin Wings',
    baseColor: '#5c8fa3',
    svg: mirror('<path d="M14,4 Q34,-6 44,8 Q30,10 14,18 Z" fill="#5c8fa3"/>'),
    rarityWeight: 7,
    statModifiers: { resist: 1, speed: 1 },
  },
  {
    id: 'wings_crystal',
    name: 'Crystal Wings',
    baseColor: '#c7a8f0',
    svg: mirror('<polygon points="14,0 38,-10 46,2 38,14 20,16" fill="#c7a8f0"/>'),
    rarityWeight: 5,
    statModifiers: { resist: 2, defense: 1 },
  },
  {
    id: 'wings_tattered',
    name: 'Tattered Wings',
    baseColor: '#5a4a63',
    svg: mirror('<path d="M14,0 L44,-8 L38,2 L42,8 L34,6 L36,14 L26,10 L28,18 L18,16 Z" fill="#5a4a63"/>'),
    rarityWeight: 4,
    statModifiers: { speed: 1, attack: 1 },
  },
  {
    id: 'wings_double',
    name: 'Double-Layer Wings',
    baseColor: '#8ad1c2',
    svg: mirror('<path d="M14,-2 L38,-12 L32,0 L40,6 L18,14 Z" fill="#8ad1c2"/><path d="M12,10 L30,4 L26,16 L32,22 L16,24 Z" fill="#6fada0"/>'),
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
