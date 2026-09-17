import type { StatKey } from '../data/stats';

/**
 * Structured behavior for each type's recessive "hidden move" (see
 * src/data/moves.ts) - the flat `effect` string on MoveDef is flavor text
 * for the catalog UI, this is what the battle engine actually executes.
 * Ordinary (dominant) moves need no entry here: power > 0 already means
 * "deal damage", handled directly by computeDamage.
 */
export type MoveEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'stage'; stat: Extract<StatKey, 'attack' | 'defense' | 'focus' | 'resist' | 'speed'>; delta: number; target: 'self' | 'target' }
  | { kind: 'status'; status: 'burn' | 'poison' | 'paralysis'; chance: number };

export const MOVE_EFFECTS: Record<string, MoveEffect> = {
  verdant_regrowth: { kind: 'heal', amount: 0.3 },
  undertow: { kind: 'stage', stat: 'speed', delta: -1, target: 'target' },
  slow_burn: { kind: 'status', status: 'burn', chance: 1 },
  updraft: { kind: 'stage', stat: 'speed', delta: 1, target: 'self' },
  static_field: { kind: 'status', status: 'paralysis', chance: 0.6 },
  rust_touch: { kind: 'stage', stat: 'defense', delta: -1, target: 'target' },
  sediment_wall: { kind: 'stage', stat: 'defense', delta: 1, target: 'self' },
  toxic_bloom: { kind: 'status', status: 'poison', chance: 1 },
  refract: { kind: 'stage', stat: 'resist', delta: 1, target: 'self' },
};
