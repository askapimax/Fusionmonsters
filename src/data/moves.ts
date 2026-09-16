import { TYPE_CYCLE, type CycleTypeId } from './types';

export type MoveCategory = 'Physical' | 'Special' | 'Status';

export interface MoveDef {
  id: string;
  name: string;
  typeId: CycleTypeId;
  category: MoveCategory;
  power: number;
  accuracy: number;
  /** false = a recessive "hidden move" - only inherited if both move-locus alleles carry it. */
  dominant: boolean;
  effect: string;
}

/**
 * Three moves per type: two ordinary dominant moves (one physical, one
 * special) and one recessive "hidden move" that only surfaces when an
 * offspring inherits it from both parents.
 */
const MOVE_TABLE: Record<CycleTypeId, Omit<MoveDef, 'typeId'>[]> = {
  flora: [
    { id: 'bramble_lash', name: 'Bramble Lash', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'A whipping strike from woody vine growth.' },
    { id: 'spore_burst', name: 'Spore Burst', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'Releases a cloud of irritant spores.' },
    { id: 'verdant_regrowth', name: 'Verdant Regrowth', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Heals a portion of the user’s HP.' },
  ],
  aqua: [
    { id: 'tide_strike', name: 'Tide Strike', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'A crashing body slam of pressurized water.' },
    { id: 'pressure_jet', name: 'Pressure Jet', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'A focused, high-pressure water jet.' },
    { id: 'undertow', name: 'Undertow', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Lowers the target’s Speed.' },
  ],
  thermal: [
    { id: 'cinder_claw', name: 'Cinder Claw', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'Claws heated to a dull red glow.' },
    { id: 'flare_burst', name: 'Flare Burst', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'A short, superheated burst of flame.' },
    { id: 'slow_burn', name: 'Slow Burn', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Inflicts a damage-over-time burn.' },
  ],
  aero: [
    { id: 'gust_slash', name: 'Gust Slash', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'A blade of compressed wind.' },
    { id: 'cyclone_pulse', name: 'Cyclone Pulse', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'A spinning pulse of pressurized air.' },
    { id: 'updraft', name: 'Updraft', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Raises the user’s Speed.' },
  ],
  volt: [
    { id: 'shock_fang', name: 'Shock Fang', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'A charged bite that arcs on contact.' },
    { id: 'arc_discharge', name: 'Arc Discharge', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'Releases a stored electrical charge.' },
    { id: 'static_field', name: 'Static Field', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Chance to paralyze the target.' },
  ],
  ferro: [
    { id: 'iron_slam', name: 'Iron Slam', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'A heavy, metal-plated body check.' },
    { id: 'magnetic_pulse', name: 'Magnetic Pulse', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'A disorienting pulse of magnetic force.' },
    { id: 'rust_touch', name: 'Rust Touch', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Lowers the target’s Defense.' },
  ],
  mineral: [
    { id: 'boulder_crash', name: 'Boulder Crash', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'Slams the target with accreted rock mass.' },
    { id: 'crystal_beam', name: 'Crystal Beam', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'Refracts energy through a crystalline lattice.' },
    { id: 'sediment_wall', name: 'Sediment Wall', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Raises the user’s Defense.' },
  ],
  toxin: [
    { id: 'venom_bite', name: 'Venom Bite', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'A bite laced with engineered venom.' },
    { id: 'acid_spray', name: 'Acid Spray', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'Sprays a corrosive chemical mixture.' },
    { id: 'toxic_bloom', name: 'Toxic Bloom', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Inflicts a damage-over-time poison.' },
  ],
  photon: [
    { id: 'photon_jab', name: 'Photon Jab', category: 'Physical', power: 55, accuracy: 95, dominant: true, effect: 'A quick strike tipped with focused light.' },
    { id: 'prism_flare', name: 'Prism Flare', category: 'Special', power: 60, accuracy: 90, dominant: true, effect: 'A blinding, refracted flare of light.' },
    { id: 'refract', name: 'Refract', category: 'Status', power: 0, accuracy: 100, dominant: false, effect: 'Recessive/hidden. Raises the user’s Resist.' },
  ],
};

export const MOVES: MoveDef[] = TYPE_CYCLE.flatMap((typeId) =>
  MOVE_TABLE[typeId].map((move) => ({ ...move, typeId })),
);

export const MOVES_BY_ID: Record<string, MoveDef> = Object.fromEntries(
  MOVES.map((move) => [move.id, move]),
);

export function movesForType(typeId: CycleTypeId): MoveDef[] {
  return MOVES.filter((move) => move.typeId === typeId);
}

export function dominantMovesForType(typeId: CycleTypeId): MoveDef[] {
  return movesForType(typeId).filter((move) => move.dominant);
}

export function hiddenMovesForType(typeId: CycleTypeId): MoveDef[] {
  return movesForType(typeId).filter((move) => !move.dominant);
}
