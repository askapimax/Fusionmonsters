import { beforeEach, describe, expect, it } from 'vitest';
import { createFounderGenome } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import { mulberry32 } from '../genetics/rng';
import { concordRegistry } from './registry';
import { __resetStorageForTests, depositToStorage, getStorage, withdrawFromStorage } from './storage';

/** Deterministic throwaway Fusion for storage tests. */
function makeFusion(seed: number): Fusion {
  return createFusion(createFounderGenome(mulberry32(seed)));
}

beforeEach(() => {
  __resetStorageForTests();
});

describe('depositToStorage', () => {
  it('adds a Fusion to storage', () => {
    const fusion = makeFusion(1);
    depositToStorage(fusion);
    expect(getStorage().length).toBe(1);
    expect(getStorage()[0]).toBe(fusion);
  });

  it('registers the deposited Fusion into concordRegistry', () => {
    const fusion = makeFusion(2);
    depositToStorage(fusion);
    const signature = concordRegistry.computeSignature(fusion.phenotype);
    expect(concordRegistry.get(signature)).toBeDefined();
  });

  it('is safe to call on an already-registered Fusion (bumps timesDiscovered instead of erroring)', () => {
    const fusion = makeFusion(3);
    concordRegistry.register(fusion.genome, fusion.phenotype);
    const signature = concordRegistry.computeSignature(fusion.phenotype);
    const before = concordRegistry.get(signature)?.timesDiscovered ?? 0;

    depositToStorage(fusion);

    expect(concordRegistry.get(signature)?.timesDiscovered).toBe(before + 1);
  });

  it('has no capacity cap - many deposits all succeed', () => {
    for (let i = 0; i < 25; i++) {
      depositToStorage(makeFusion(100 + i));
    }
    expect(getStorage().length).toBe(25);
  });

  it('appends in deposit order', () => {
    const a = makeFusion(4);
    const b = makeFusion(5);
    depositToStorage(a);
    depositToStorage(b);
    expect(getStorage().map((f) => f)).toEqual([a, b]);
  });
});

describe('withdrawFromStorage', () => {
  it('removes and returns the Fusion at the given index', () => {
    const a = makeFusion(10);
    const b = makeFusion(11);
    depositToStorage(a);
    depositToStorage(b);

    const withdrawn = withdrawFromStorage(0);

    expect(withdrawn).toBe(a);
    expect(getStorage().map((f) => f)).toEqual([b]);
  });

  it('returns null for an out-of-range index and does not change storage', () => {
    depositToStorage(makeFusion(12));
    expect(withdrawFromStorage(-1)).toBeNull();
    expect(withdrawFromStorage(5)).toBeNull();
    expect(getStorage().length).toBe(1);
  });

  it('returns null when storage is empty', () => {
    expect(withdrawFromStorage(0)).toBeNull();
  });

  it('shifts remaining entries down after a withdrawal', () => {
    const a = makeFusion(13);
    const b = makeFusion(14);
    const c = makeFusion(15);
    depositToStorage(a);
    depositToStorage(b);
    depositToStorage(c);

    withdrawFromStorage(1); // remove b

    expect(getStorage().map((f) => f)).toEqual([a, c]);
  });
});

describe('getStorage', () => {
  it('returns an empty array when nothing has been deposited', () => {
    expect(getStorage()).toEqual([]);
  });

  it('reflects live storage state without letting callers mutate it directly', () => {
    depositToStorage(makeFusion(20));
    const view = getStorage();
    expect(view.length).toBe(1);
    // TypeScript enforces the readonly view at compile time; at runtime the
    // underlying array is still the same object.
    depositToStorage(makeFusion(21));
    expect(view.length).toBe(2);
  });
});
