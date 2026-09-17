import type { Fusion } from '../genetics/fusion';
import type { RNG } from '../genetics/rng';
import { getTypeEffectiveness } from '../data/types';
import { MOVES_BY_ID, type MoveDef } from '../data/moves';
import { MOVE_EFFECTS } from './moveEffects';

/** How much a single +/- stage shifts the underlying stat, linear rather
 * than the real Pokemon curve - close enough in spirit, much easier to
 * reason about for a first pass. Clamped to +/-3 stages (i.e. 25%-175%). */
const STAGE_STEP = 0.25;
const MAX_STAGE = 3;

/** Tunes overall damage-per-hit against the stat ranges founder Fusions
 * actually roll (roughly 5-30) so a battle runs a handful of turns rather
 * than one-shotting or dragging on forever. Placeholder balance, not final. */
const DAMAGE_DIVISOR = 8;

const END_OF_TURN_STATUS_DAMAGE_FRACTION = 1 / 8;
const PARALYSIS_SKIP_CHANCE = 0.25;

/**
 * Catch-rate curve for the capture flow (TODO.md "Spawns & Encounters" -
 * Capture flow), modeled on the genre-standard weaken-then-throw loop this
 * game's README explicitly calls out: chance improves as the wild Fusion's
 * remaining HP drops, and a status condition (burn/poison/paralysis) adds a
 * flat bonus on top, matching how status effects traditionally help
 * catches. `kitStrength` is a plain multiplier on top of that curve (1.0 for
 * the baseline Sample Kit, see `src/data/items.ts`), so a future weaker/
 * stronger kit item can reuse this exact formula rather than needing a
 * redesign - it never needs its own HP/status logic.
 *
 * At kitStrength 1.0:
 *  - Full HP, no status:  CATCH_FLOOR alone            = 5%
 *  - Full HP, statused:   CATCH_FLOOR + STATUS_BONUS    = 25%
 *  - Half HP, no status:  CATCH_FLOOR + 0.5*HP_WEIGHT    = 40%
 *  - Near 0 HP, statused: CATCH_FLOOR + ~HP_WEIGHT + STATUS_BONUS, clamped
 *                          to CATCH_CEILING              ~= 94%, capped at 98%
 *
 * Placeholder balance, not final tuning - same spirit as `DAMAGE_DIVISOR`
 * above.
 */
const CATCH_FLOOR = 0.05;
const CATCH_HP_WEIGHT = 0.7;
const CATCH_STATUS_BONUS = 0.2;
const CATCH_CEILING = 0.98;

export type StageStat = 'attack' | 'defense' | 'focus' | 'resist' | 'speed';
export type StatusCondition = 'burn' | 'poison' | 'paralysis' | null;

export type StatStages = Record<StageStat, number>;

export interface BattleCombatant {
  fusion: Fusion;
  label: string;
  maxHp: number;
  currentHp: number;
  stages: StatStages;
  status: StatusCondition;
}

function freshStages(): StatStages {
  return { attack: 0, defense: 0, focus: 0, resist: 0, speed: 0 };
}

/** `startingHp` lets a returning party member re-enter a battle at whatever
 * HP it's currently carrying instead of always starting full - see
 * src/state/party.ts. Omit it (or a wild encounter) to start at full HP. */
export function createCombatant(fusion: Fusion, label: string, startingHp?: number): BattleCombatant {
  const maxHp = Math.max(1, Math.round(fusion.phenotype.stats.hp));
  const currentHp = startingHp === undefined ? maxHp : Math.max(0, Math.min(maxHp, startingHp));
  return { fusion, label, maxHp, currentHp, stages: freshStages(), status: null };
}

export function isFainted(combatant: BattleCombatant): boolean {
  return combatant.currentHp <= 0;
}

function stageMultiplier(stage: number): number {
  const clamped = Math.max(-MAX_STAGE, Math.min(MAX_STAGE, stage));
  return 1 + clamped * STAGE_STEP;
}

export function effectiveStat(combatant: BattleCombatant, stat: StageStat): number {
  return Math.max(1, Math.round(combatant.fusion.phenotype.stats[stat] * stageMultiplier(combatant.stages[stat])));
}

/** A Fusion's usable movepool for battle: its (already-deduplicated)
 * expressed move ids, resolved against the catalog, falling back to its
 * type's first dominant move if genetics somehow produced an empty pool
 * (shouldn't happen, but a battle needs at least one option to be playable). */
export function resolveMoves(fusion: Fusion): MoveDef[] {
  const moves = fusion.phenotype.moves.map((id) => MOVES_BY_ID[id]).filter((m): m is MoveDef => Boolean(m));
  if (moves.length > 0) return moves.slice(0, 4);
  const fallback = Object.values(MOVES_BY_ID).find((m) => m.typeId === fusion.phenotype.primaryType && m.dominant);
  return fallback ? [fallback] : [Object.values(MOVES_BY_ID)[0]];
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
  isStab: boolean;
}

export function computeDamage(attacker: BattleCombatant, defender: BattleCombatant, move: MoveDef, rng: RNG): DamageResult {
  if (move.power <= 0) return { damage: 0, effectiveness: 1, isStab: false };

  const atk = move.category === 'Physical' ? effectiveStat(attacker, 'attack') : effectiveStat(attacker, 'focus');
  const def = move.category === 'Physical' ? effectiveStat(defender, 'defense') : effectiveStat(defender, 'resist');

  const defenderPhenotype = defender.fusion.phenotype;
  const effectiveness =
    getTypeEffectiveness(move.typeId, defenderPhenotype.primaryType) *
    (defenderPhenotype.secondaryType ? getTypeEffectiveness(move.typeId, defenderPhenotype.secondaryType) : 1);

  const attackerPhenotype = attacker.fusion.phenotype;
  const isStab = attackerPhenotype.primaryType === move.typeId || attackerPhenotype.secondaryType === move.typeId;

  const variance = 0.85 + rng() * 0.15;
  const raw = ((move.power * atk) / Math.max(1, def) / DAMAGE_DIVISOR) * effectiveness * (isStab ? 1.5 : 1) * variance;

  return { damage: Math.max(1, Math.round(raw)), effectiveness, isStab };
}

export function rollAccuracy(move: MoveDef, rng: RNG): boolean {
  return rng() * 100 < move.accuracy;
}

/** Applies a hidden move's structured effect (see moveEffects.ts) and
 * returns a human-readable line per consequence, for the battle log. */
export function applyMoveEffect(move: MoveDef, user: BattleCombatant, target: BattleCombatant, rng: RNG): string[] {
  const effect = MOVE_EFFECTS[move.id];
  if (!effect) return [];
  const messages: string[] = [];

  if (effect.kind === 'heal') {
    const healed = Math.min(user.maxHp - user.currentHp, Math.round(user.maxHp * effect.amount));
    user.currentHp += healed;
    messages.push(healed > 0 ? `${user.label} recovered some HP!` : `${user.label}'s HP is already full!`);
  } else if (effect.kind === 'stage') {
    const who = effect.target === 'self' ? user : target;
    const before = who.stages[effect.stat];
    who.stages[effect.stat] = Math.max(-MAX_STAGE, Math.min(MAX_STAGE, before + effect.delta));
    if (who.stages[effect.stat] === before) {
      messages.push(`${who.label}'s ${effect.stat} won't go any ${effect.delta > 0 ? 'higher' : 'lower'}!`);
    } else {
      messages.push(`${who.label}'s ${effect.stat} ${effect.delta > 0 ? 'rose' : 'fell'}!`);
    }
  } else if (effect.kind === 'status') {
    if (target.status !== null) {
      messages.push(`${target.label} is already affected!`);
    } else if (rng() < effect.chance) {
      target.status = effect.status;
      messages.push(statusInflictedMessage(target.label, effect.status));
    } else {
      messages.push('But it failed!');
    }
  }

  return messages;
}

function statusInflictedMessage(label: string, status: Exclude<StatusCondition, null>): string {
  if (status === 'burn') return `${label} was burned!`;
  if (status === 'poison') return `${label} was poisoned!`;
  return `${label} was paralyzed!`;
}

/** Rolled once at the start of a combatant's turn - paralysis has a chance
 * to skip the turn entirely, matching the classic "fully paralyzed" beat. */
export function rollParalysisSkip(combatant: BattleCombatant, rng: RNG): boolean {
  return combatant.status === 'paralysis' && rng() < PARALYSIS_SKIP_CHANCE;
}

export interface StatusTickResult {
  damage: number;
  message: string | null;
}

/** End-of-turn burn/poison damage. Returns 0/`null` if the combatant has no
 * damaging status or has already fainted (no point ticking a dead combatant). */
export function tickStatusDamage(combatant: BattleCombatant): StatusTickResult {
  if (isFainted(combatant) || (combatant.status !== 'burn' && combatant.status !== 'poison')) {
    return { damage: 0, message: null };
  }
  const damage = Math.max(1, Math.round(combatant.maxHp * END_OF_TURN_STATUS_DAMAGE_FRACTION));
  combatant.currentHp = Math.max(0, combatant.currentHp - damage);
  const verb = combatant.status === 'burn' ? 'the burn' : 'poison';
  return { damage, message: `${combatant.label} is hurt by ${verb}!` };
}

export function applyDamage(target: BattleCombatant, damage: number): void {
  target.currentHp = Math.max(0, target.currentHp - damage);
}

/**
 * Returns the 0-1 probability that a sample-kit capture attempt against
 * `wild` succeeds, given a kit of the given `kitStrength` (see the curve
 * comment above `CATCH_FLOOR`). Pure and side-effect-free so it's directly
 * testable and reusable outside `BattleScene` - `attemptCapture` below is
 * the thin RNG-rolling wrapper battle code should actually call.
 */
export function computeCatchChance(wild: BattleCombatant, kitStrength: number): number {
  const hpFraction = wild.maxHp > 0 ? Math.max(0, Math.min(1, wild.currentHp / wild.maxHp)) : 0;
  const statusBonus = wild.status !== null ? CATCH_STATUS_BONUS : 0;
  const raw = (CATCH_FLOOR + (1 - hpFraction) * CATCH_HP_WEIGHT + statusBonus) * kitStrength;
  return Math.max(0, Math.min(CATCH_CEILING, raw));
}

/** Rolls a single capture attempt against `computeCatchChance`'s probability. */
export function attemptCapture(wild: BattleCombatant, kitStrength: number, rng: RNG): boolean {
  return rng() < computeCatchChance(wild, kitStrength);
}

/** Higher effective Speed acts first; ties broken randomly rather than
 * always favoring one side. */
export function determineTurnOrder(a: BattleCombatant, b: BattleCombatant, rng: RNG): [BattleCombatant, BattleCombatant] {
  const speedA = effectiveStat(a, 'speed');
  const speedB = effectiveStat(b, 'speed');
  if (speedA === speedB) return rng() < 0.5 ? [a, b] : [b, a];
  return speedA > speedB ? [a, b] : [b, a];
}
