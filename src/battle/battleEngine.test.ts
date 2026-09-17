import { describe, expect, it } from 'vitest';
import { createFounderGenome } from '../genetics/breeding';
import { createFusion } from '../genetics/fusion';
import { mulberry32 } from '../genetics/rng';
import { MOVES_BY_ID } from '../data/moves';
import type { CycleTypeId } from '../data/types';
import {
  applyDamage,
  applyMoveEffect,
  computeDamage,
  createCombatant,
  determineTurnOrder,
  effectiveStat,
  isFainted,
  resolveMoves,
  rollParalysisSkip,
  tickStatusDamage,
} from './battleEngine';

function combatant(seed: number, label: string, forcedPrimaryType?: CycleTypeId) {
  const genome = createFounderGenome(mulberry32(seed), forcedPrimaryType ? { forcedPrimaryType } : {});
  return createCombatant(createFusion(genome), label);
}

describe('createCombatant', () => {
  it('starts at full HP by default, matching the max HP stat', () => {
    const c = combatant(1, 'Test');
    expect(c.currentHp).toBe(c.maxHp);
    expect(c.maxHp).toBeGreaterThan(0);
  });

  it('clamps a provided starting HP into [0, maxHp]', () => {
    const genome = createFounderGenome(mulberry32(2));
    const fusion = createFusion(genome);
    const over = createCombatant(fusion, 'Test', fusion.phenotype.stats.hp + 999);
    expect(over.currentHp).toBe(over.maxHp);
    const under = createCombatant(fusion, 'Test', -50);
    expect(under.currentHp).toBe(0);
  });
});

describe('resolveMoves', () => {
  it('always returns at least one real catalog move', () => {
    for (let seed = 0; seed < 30; seed++) {
      const genome = createFounderGenome(mulberry32(seed));
      const moves = resolveMoves(createFusion(genome));
      expect(moves.length).toBeGreaterThan(0);
      for (const move of moves) {
        expect(MOVES_BY_ID[move.id]).toBe(move);
      }
    }
  });
});

describe('computeDamage', () => {
  it('a status move (0 power) always deals 0 damage', () => {
    const attacker = combatant(3, 'A', 'flora');
    const defender = combatant(4, 'B', 'aqua');
    const result = computeDamage(attacker, defender, MOVES_BY_ID.verdant_regrowth, mulberry32(5));
    expect(result.damage).toBe(0);
  });

  it('applies double damage for a type advantage and half for a disadvantage', () => {
    // Per the type cycle (src/data/types.ts), flora is strong against its
    // next two neighbors (aqua, thermal) and weak against its previous two
    // (toxin, photon).
    const attacker = combatant(10, 'A', 'flora');
    const strongTarget = combatant(11, 'B', 'aqua');
    const weakTarget = combatant(12, 'C', 'toxin');
    const move = MOVES_BY_ID.bramble_lash;
    const rng = () => 0.5; // fixed variance roll
    const vsStrong = computeDamage(attacker, strongTarget, move, rng);
    const vsWeak = computeDamage(attacker, weakTarget, move, rng);
    expect(vsStrong.effectiveness).toBe(2);
    expect(vsWeak.effectiveness).toBe(0.5);
    expect(vsStrong.damage).toBeGreaterThan(vsWeak.damage);
  });

  it('deals at least 1 damage even against a very tanky defender', () => {
    const attacker = combatant(20, 'A');
    const defender = combatant(21, 'B');
    defender.stages.defense = 3;
    defender.stages.resist = 3;
    const result = computeDamage(attacker, defender, MOVES_BY_ID.bramble_lash, () => 0);
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it('grants a same-type-attack-bonus boost when the move matches the attacker\'s type', () => {
    const attacker = combatant(30, 'A', 'flora');
    const defender = combatant(31, 'B', 'flora');
    const rng = () => 0.5;
    const stabMove = MOVES_BY_ID.bramble_lash; // flora
    const otherMove = { ...MOVES_BY_ID.tide_strike, power: MOVES_BY_ID.bramble_lash.power }; // aqua, same power
    const stabResult = computeDamage(attacker, defender, stabMove, rng);
    const noStabResult = computeDamage(attacker, defender, otherMove, rng);
    expect(stabResult.damage).toBeGreaterThan(noStabResult.damage);
  });
});

describe('effectiveStat / stat stages', () => {
  it('a positive stage raises the effective stat, a negative one lowers it', () => {
    const c = combatant(40, 'A');
    const base = effectiveStat(c, 'attack');
    c.stages.attack = 2;
    expect(effectiveStat(c, 'attack')).toBeGreaterThan(base);
    c.stages.attack = -2;
    expect(effectiveStat(c, 'attack')).toBeLessThan(base);
  });
});

describe('applyMoveEffect', () => {
  it('verdant_regrowth heals the user without exceeding max HP', () => {
    const user = combatant(50, 'Healer', 'flora');
    const dummy = combatant(51, 'Dummy');
    user.currentHp = 1;
    applyMoveEffect(MOVES_BY_ID.verdant_regrowth, user, dummy, () => 0);
    expect(user.currentHp).toBeGreaterThan(1);
    expect(user.currentHp).toBeLessThanOrEqual(user.maxHp);
  });

  it('static_field inflicts paralysis on the target when the roll succeeds', () => {
    const user = combatant(60, 'Zapper', 'volt');
    const target = combatant(61, 'Target');
    applyMoveEffect(MOVES_BY_ID.static_field, user, target, () => 0); // 0 < chance -> succeeds
    expect(target.status).toBe('paralysis');
  });

  it('does not stack a second status onto an already-afflicted target', () => {
    const user = combatant(62, 'Zapper', 'volt');
    const target = combatant(63, 'Target');
    target.status = 'burn';
    applyMoveEffect(MOVES_BY_ID.static_field, user, target, () => 0);
    expect(target.status).toBe('burn');
  });

  it('rust_touch lowers the target\'s defense stage, not the user\'s', () => {
    const user = combatant(64, 'A', 'ferro');
    const target = combatant(65, 'B');
    applyMoveEffect(MOVES_BY_ID.rust_touch, user, target, () => 0);
    expect(target.stages.defense).toBeLessThan(0);
    expect(user.stages.defense).toBe(0);
  });
});

describe('tickStatusDamage', () => {
  it('deals damage for burn/poison and produces no message for a healthy status-free combatant', () => {
    const healthy = combatant(70, 'A');
    expect(tickStatusDamage(healthy)).toEqual({ damage: 0, message: null });

    const burned = combatant(71, 'B');
    burned.status = 'burn';
    const result = tickStatusDamage(burned);
    expect(result.damage).toBeGreaterThan(0);
    expect(result.message).toContain('burn');
    expect(burned.currentHp).toBe(burned.maxHp - result.damage);
  });

  it('does not damage a combatant that has already fainted', () => {
    const fainted = combatant(72, 'A');
    fainted.status = 'poison';
    fainted.currentHp = 0;
    expect(tickStatusDamage(fainted)).toEqual({ damage: 0, message: null });
  });
});

describe('applyDamage / isFainted', () => {
  it('clamps HP at 0 and reports fainted once it hits 0', () => {
    const c = combatant(80, 'A');
    expect(isFainted(c)).toBe(false);
    applyDamage(c, c.maxHp + 999);
    expect(c.currentHp).toBe(0);
    expect(isFainted(c)).toBe(true);
  });
});

describe('determineTurnOrder', () => {
  it('the faster combatant always goes first', () => {
    const fast = combatant(90, 'Fast');
    const slow = combatant(91, 'Slow');
    fast.stages.speed = 3;
    slow.stages.speed = -3;
    const [first, second] = determineTurnOrder(fast, slow, () => 0.5);
    expect(first).toBe(fast);
    expect(second).toBe(slow);
  });
});

describe('rollParalysisSkip', () => {
  it('never skips a combatant with no status', () => {
    const c = combatant(100, 'A');
    expect(rollParalysisSkip(c, () => 0)).toBe(false);
  });

  it('can skip a paralyzed combatant when the roll is low enough', () => {
    const c = combatant(101, 'A');
    c.status = 'paralysis';
    expect(rollParalysisSkip(c, () => 0)).toBe(true);
    expect(rollParalysisSkip(c, () => 0.99)).toBe(false);
  });
});
