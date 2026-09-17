import { beforeEach, describe, expect, it } from 'vitest';
import { createFounderGenome } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import { mulberry32 } from '../genetics/rng';
import { concordRegistry } from './registry';
import {
  __resetPartyForTests,
  MAX_ROSTER_SIZE,
  addToRoster,
  getActiveSlotIndex,
  getPlayerCurrentHp,
  getPlayerFusion,
  getRoster,
  healPlayerFully,
  removeFromRoster,
  reorderRoster,
  setActiveSlot,
  setPlayerCurrentHp,
} from './party';

/** Deterministic throwaway Fusion for roster tests (doesn't touch the founder-genome RNG path). */
function makeFusion(seed: number): Fusion {
  return createFusion(createFounderGenome(mulberry32(seed)));
}

beforeEach(() => {
  __resetPartyForTests();
});

describe('legacy single-Fusion API (getPlayerFusion / HP)', () => {
  it('lazily auto-assigns a random founder into an empty roster on first access', () => {
    expect(getRoster().length).toBe(0);
    const fusion = getPlayerFusion();
    expect(fusion).toBeDefined();
    expect(getRoster().length).toBe(1);
    expect(getRoster()[0].fusion).toBe(fusion);
  });

  it('keeps returning the same Fusion instance across repeated calls', () => {
    const first = getPlayerFusion();
    const second = getPlayerFusion();
    expect(second).toBe(first);
  });

  it('registers the auto-assigned founder into concordRegistry', () => {
    const fusion = getPlayerFusion();
    const signature = concordRegistry.computeSignature(fusion.phenotype);
    expect(concordRegistry.get(signature)).toBeDefined();
  });

  it('initializes currentHp to the founder max HP', () => {
    const fusion = getPlayerFusion();
    expect(getPlayerCurrentHp()).toBe(fusion.phenotype.stats.hp);
  });

  it('setPlayerCurrentHp clamps to [0, maxHp]', () => {
    const fusion = getPlayerFusion();
    const maxHp = fusion.phenotype.stats.hp;

    setPlayerCurrentHp(maxHp + 1000);
    expect(getPlayerCurrentHp()).toBe(maxHp);

    setPlayerCurrentHp(-1000);
    expect(getPlayerCurrentHp()).toBe(0);

    setPlayerCurrentHp(1);
    expect(getPlayerCurrentHp()).toBe(1);
  });

  it('healPlayerFully restores currentHp to max', () => {
    const fusion = getPlayerFusion();
    setPlayerCurrentHp(1);
    healPlayerFully();
    expect(getPlayerCurrentHp()).toBe(fusion.phenotype.stats.hp);
  });

  it('setPlayerCurrentHp/healPlayerFully also auto-assign a founder if nothing exists yet', () => {
    expect(getRoster().length).toBe(0);
    healPlayerFully();
    expect(getRoster().length).toBe(1);
  });
});

describe('addToRoster', () => {
  it('adds a Fusion and registers it in concordRegistry', () => {
    const fusion = makeFusion(1);
    const added = addToRoster(fusion);
    expect(added).toBe(true);
    const signature = concordRegistry.computeSignature(fusion.phenotype);
    expect(concordRegistry.get(signature)).toBeDefined();
    expect(getRoster().map((slot) => slot.fusion)).toContain(fusion);
  });

  it('adds new members at full HP', () => {
    const fusion = makeFusion(2);
    addToRoster(fusion);
    const slot = getRoster().find((s) => s.fusion === fusion);
    expect(slot?.currentHp).toBe(fusion.phenotype.stats.hp);
  });

  it('makes the first added Fusion the active slot', () => {
    const fusion = makeFusion(3);
    addToRoster(fusion);
    expect(getPlayerFusion()).toBe(fusion);
    expect(getActiveSlotIndex()).toBe(0);
  });

  it('does not disturb the existing active slot when adding a second member', () => {
    const first = makeFusion(4);
    const second = makeFusion(5);
    addToRoster(first);
    addToRoster(second);
    expect(getPlayerFusion()).toBe(first);
  });

  it('enforces the 6-slot cap', () => {
    for (let i = 0; i < MAX_ROSTER_SIZE; i++) {
      expect(addToRoster(makeFusion(100 + i))).toBe(true);
    }
    expect(getRoster().length).toBe(MAX_ROSTER_SIZE);
    expect(addToRoster(makeFusion(999))).toBe(false);
    expect(getRoster().length).toBe(MAX_ROSTER_SIZE);
  });
});

describe('removeFromRoster', () => {
  it('removes and returns the Fusion at the given index', () => {
    const a = makeFusion(10);
    const b = makeFusion(11);
    addToRoster(a);
    addToRoster(b);
    const removed = removeFromRoster(0);
    expect(removed).toBe(a);
    expect(getRoster().map((s) => s.fusion)).toEqual([b]);
  });

  it('returns null for an out-of-range index and does not change the roster', () => {
    addToRoster(makeFusion(12));
    expect(removeFromRoster(-1)).toBeNull();
    expect(removeFromRoster(5)).toBeNull();
    expect(getRoster().length).toBe(1);
  });

  it('falls back the active slot to slot 0 when the active member is removed', () => {
    const a = makeFusion(13);
    const b = makeFusion(14);
    const c = makeFusion(15);
    addToRoster(a);
    addToRoster(b);
    addToRoster(c);
    setActiveSlot(1); // b is active
    expect(getPlayerFusion()).toBe(b);

    removeFromRoster(1); // remove the active member
    expect(getRoster().map((s) => s.fusion)).toEqual([a, c]);
    expect(getPlayerFusion()).toBe(a);
    expect(getActiveSlotIndex()).toBe(0);
  });

  it('leaves the active slot untouched (by identity) when removing a non-active member', () => {
    const a = makeFusion(16);
    const b = makeFusion(17);
    const c = makeFusion(18);
    addToRoster(a);
    addToRoster(b);
    addToRoster(c);
    setActiveSlot(2); // c is active

    removeFromRoster(0); // remove a, a non-active earlier slot
    expect(getPlayerFusion()).toBe(c);
    expect(getRoster().map((s) => s.fusion)).toEqual([b, c]);
  });

  it('becomes "none" (auto-reassigns on next access) when the last member is removed', () => {
    const a = makeFusion(19);
    addToRoster(a);
    expect(getActiveSlotIndex()).toBe(0);

    removeFromRoster(0);
    expect(getRoster().length).toBe(0);
    expect(getActiveSlotIndex()).toBeNull();

    // Next access lazily assigns a fresh founder, same as a never-touched roster.
    const fresh = getPlayerFusion();
    expect(fresh).not.toBe(a);
    expect(getRoster().length).toBe(1);
  });
});

describe('reorderRoster', () => {
  it('moves a slot from one index to another', () => {
    const a = makeFusion(20);
    const b = makeFusion(21);
    const c = makeFusion(22);
    addToRoster(a);
    addToRoster(b);
    addToRoster(c);

    reorderRoster(0, 2);
    expect(getRoster().map((s) => s.fusion)).toEqual([b, c, a]);
  });

  it('keeps the active slot pointed at the same Fusion across a reorder', () => {
    const a = makeFusion(23);
    const b = makeFusion(24);
    const c = makeFusion(25);
    addToRoster(a);
    addToRoster(b);
    addToRoster(c);
    setActiveSlot(0); // a is active

    reorderRoster(0, 2); // a moves from index 0 to index 2
    expect(getPlayerFusion()).toBe(a);
    expect(getActiveSlotIndex()).toBe(2);
  });

  it('is a no-op for out-of-range or equal indices', () => {
    const a = makeFusion(26);
    const b = makeFusion(27);
    addToRoster(a);
    addToRoster(b);

    reorderRoster(-1, 1);
    reorderRoster(0, 5);
    reorderRoster(1, 1);
    expect(getRoster().map((s) => s.fusion)).toEqual([a, b]);
  });
});

describe('setActiveSlot', () => {
  it('changes which slot getPlayerFusion/HP operate on', () => {
    const a = makeFusion(30);
    const b = makeFusion(31);
    addToRoster(a);
    addToRoster(b);

    setActiveSlot(1);
    expect(getPlayerFusion()).toBe(b);
    expect(getPlayerCurrentHp()).toBe(b.phenotype.stats.hp);

    setPlayerCurrentHp(1);
    expect(getRoster()[1].currentHp).toBe(1);
    expect(getRoster()[0].currentHp).toBe(a.phenotype.stats.hp);
  });

  it('is a no-op for an out-of-range index', () => {
    const a = makeFusion(32);
    addToRoster(a);
    setActiveSlot(1);
    setActiveSlot(-1);
    expect(getPlayerFusion()).toBe(a);
  });
});
