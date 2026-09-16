/**
 * Elemental type catalog.
 *
 * Nine types form a closed effectiveness cycle (each strong against the
 * next two, weak against the previous two). "void" sits outside the cycle:
 * it is the corrupted type introduced by the Unraveling (see README) and
 * cannot appear as a starting/parent allele - only genome mutation can
 * introduce it, which is why it's flagged `mutationOnly`.
 */

export const TYPE_CYCLE = [
  'flora',
  'aqua',
  'thermal',
  'aero',
  'volt',
  'ferro',
  'mineral',
  'toxin',
  'photon',
] as const;

export type CycleTypeId = (typeof TYPE_CYCLE)[number];
export type TypeId = CycleTypeId | 'void';

export const TYPE_IDS: readonly TypeId[] = [...TYPE_CYCLE, 'void'];

export interface TypeDef {
  id: TypeId;
  name: string;
  description: string;
  /** Hex color used for UI chips / effectiveness charts. */
  color: string;
  /** Used when this type competes as an allele at a type-gene locus. */
  dominanceRank: number;
  /** True if this type can only appear through mutation, never as a normal parent allele. */
  mutationOnly: boolean;
  strongAgainst: TypeId[];
  weakAgainst: TypeId[];
}

const NAMES: Record<TypeId, string> = {
  flora: 'Flora',
  aqua: 'Aqua',
  thermal: 'Thermal',
  aero: 'Aero',
  volt: 'Volt',
  ferro: 'Ferro',
  mineral: 'Mineral',
  toxin: 'Toxin',
  photon: 'Photon',
  void: 'Void',
};

const DESCRIPTIONS: Record<TypeId, string> = {
  flora: 'Engineered plant biomass. Fast-growing, photosynthetic, quietly relentless.',
  aqua: 'Water-cycle specialists built to filter, flood, or drown out a fight.',
  thermal: 'Heat-cycle Fusions bred for the reclaimed volcanic flats.',
  aero: 'Pressure and windflow specialists, most at home well off the ground.',
  volt: 'Bio-electric Fusions descended from the original grid-stabilizer line.',
  ferro: 'Metal-accreting Fusions that pull trace ore straight out of the soil.',
  mineral: 'Slow, dense, built like the crystal flats they were designed to seed.',
  toxin: 'Chemical-cycle Fusions bred to neutralize industrial runoff, not always politely.',
  photon: 'Light-cycle Fusions from the old solar-canopy program.',
  void: 'Not a designed type. A corrupted signature left by the Unraveling gene sequence - unstable, and never bred for on purpose.',
};

const COLORS: Record<TypeId, string> = {
  flora: '#4caf50',
  aqua: '#2196f3',
  thermal: '#e05a2b',
  aero: '#8ecae6',
  volt: '#ffd60a',
  ferro: '#8d99ae',
  mineral: '#a97142',
  toxin: '#7b2cbf',
  photon: '#f4e04d',
  void: '#4b2e83',
};

function cycleNeighbor(id: CycleTypeId, offset: number): CycleTypeId {
  const i = TYPE_CYCLE.indexOf(id);
  return TYPE_CYCLE[(i + offset + TYPE_CYCLE.length) % TYPE_CYCLE.length];
}

function buildTypes(): Record<TypeId, TypeDef> {
  const defs = {} as Record<TypeId, TypeDef>;

  TYPE_CYCLE.forEach((id, index) => {
    defs[id] = {
      id,
      name: NAMES[id],
      description: DESCRIPTIONS[id],
      color: COLORS[id],
      dominanceRank: index + 2, // 2..10, keeps 1 reserved for the mutation-only outlier
      mutationOnly: false,
      strongAgainst: [cycleNeighbor(id, 1), cycleNeighbor(id, 2)],
      weakAgainst: [cycleNeighbor(id, -1), cycleNeighbor(id, -2)],
    };
  });

  defs.void = {
    id: 'void',
    name: NAMES.void,
    description: DESCRIPTIONS.void,
    color: COLORS.void,
    dominanceRank: 1,
    mutationOnly: true,
    strongAgainst: ['photon', 'mineral'],
    weakAgainst: ['aero', 'volt'],
  };

  return defs;
}

export const TYPES: Record<TypeId, TypeDef> = buildTypes();

/** The pool of types that can appear as a normal parent/founder allele. */
export const BREEDABLE_TYPE_IDS: CycleTypeId[] = [...TYPE_CYCLE];

export function getTypeEffectiveness(attacker: TypeId, defender: TypeId): number {
  const attackerDef = TYPES[attacker];
  if (attackerDef.strongAgainst.includes(defender)) return 2;
  if (attackerDef.weakAgainst.includes(defender)) return 0.5;
  return 1;
}
