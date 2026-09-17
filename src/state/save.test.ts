import { beforeEach, describe, expect, it } from 'vitest';
import { createFounderGenome } from '../genetics/breeding';
import { createFusion } from '../genetics/fusion';
import { mulberry32 } from '../genetics/rng';
import { playerInventory } from './inventory';
import { __resetPartyForTests, addToRoster, getActiveSlotIndex, getRoster } from './party';
import { getPlayerAppearance, getPlayerName, setPlayerAppearance, setPlayerName } from './player';
import { concordRegistry } from './registry';
import {
  hasSaveData,
  loadSaveBlob,
  restoreFromSaveBlob,
  SAVE_KEY,
  saveGame,
  serializeSaveBlob,
} from './save';
import { __resetStorageForTests, depositToStorage, getStorage } from './storage';
import { setWorldPosition } from './worldPosition';

/** Deterministic throwaway Fusion for save/load tests. */
function makeFusion(seed: number) {
  return createFusion(createFounderGenome(mulberry32(seed)));
}

/**
 * Node (unlike a browser) has no global `localStorage` - vitest's default
 * "node" test environment doesn't provide one either. A minimal in-memory
 * `Storage` implementation is enough to exercise `save.ts`'s real
 * `localStorage.getItem`/`setItem` calls without pulling in a jsdom
 * environment just for this one module. Vitest isolates each test file's
 * globals by default, so this doesn't leak into other test files.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

(globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();

function resetAllState(): void {
  __resetPartyForTests();
  __resetStorageForTests();
  playerInventory.length = 0;
  concordRegistry.restore([]);
  localStorage.clear();
}

beforeEach(() => {
  resetAllState();
});

// Run before anything else in this file sets a position, so it observes
// `worldPosition.ts`'s real pre-`WorldScene` default (no reset export exists
// for it - see that module's doc comment - so test order does the resetting
// here instead).
describe('position edge case (must run before any setWorldPosition call)', () => {
  it('serializes position as null when WorldScene has never set one yet', () => {
    const blob = serializeSaveBlob();
    expect(blob.position).toBeNull();
  });
});

describe('serializeSaveBlob', () => {
  it('gathers player/position/roster/storage/inventory/registry into a version-1 blob', () => {
    setPlayerAppearance('female');
    setPlayerName('Rin');
    setWorldPosition('route_one_stub', 5, 7);

    const a = makeFusion(1);
    const b = makeFusion(2);
    addToRoster(a);
    addToRoster(b);
    const stored = makeFusion(3);
    depositToStorage(stored);
    playerInventory.push({ itemId: 'verdant_salve', quantity: 2 });

    const blob = serializeSaveBlob();

    expect(blob.version).toBe(1);
    expect(blob.player).toEqual({ appearance: 'female', name: 'Rin' });
    expect(blob.position).toEqual({ zoneId: 'route_one_stub', spawn: { col: 5, row: 7 } });
    expect(blob.roster).toEqual([
      { genome: a.genome, currentHp: a.phenotype.stats.hp },
      { genome: b.genome, currentHp: b.phenotype.stats.hp },
    ]);
    expect(blob.activeSlotIndex).toBe(0);
    expect(blob.storage).toEqual([stored.genome]);
    expect(blob.inventory).toEqual(playerInventory);
    expect(blob.registry).toEqual(concordRegistry.list());
    expect(blob.storyFlags).toEqual({});
  });
});

describe('saveGame / hasSaveData / loadSaveBlob', () => {
  it('report no save data until one has been written', () => {
    expect(loadSaveBlob()).toBeNull();
    expect(hasSaveData()).toBe(false);
  });

  it('saveGame writes a blob that hasSaveData/loadSaveBlob then see', () => {
    setWorldPosition('fernbrook_outpost', 1, 2);
    expect(saveGame()).toBe(true);
    expect(hasSaveData()).toBe(true);
    expect(loadSaveBlob()?.version).toBe(1);
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('gracefully treats corrupted JSON as no save', () => {
    localStorage.setItem(SAVE_KEY, 'not valid json{{{');
    expect(loadSaveBlob()).toBeNull();
    expect(hasSaveData()).toBe(false);
  });

  it('gracefully treats a wrong-version blob as no save', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 999, player: { appearance: 'male', name: 'x' } }));
    expect(loadSaveBlob()).toBeNull();
  });

  it('gracefully treats a structurally-incomplete blob as no save', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1 }));
    expect(loadSaveBlob()).toBeNull();
  });
});

describe('round trip: save, wipe all state, load, restore', () => {
  it('restores player/roster/storage/inventory/registry back to exactly what was saved', () => {
    setPlayerAppearance('male');
    setPlayerName('Kade');
    setWorldPosition('fernbrook_outpost', 3, 4);

    const active = makeFusion(10);
    addToRoster(active);
    const boxed = makeFusion(11);
    depositToStorage(boxed);
    playerInventory.push({ itemId: 'sample_kit', quantity: 3 });

    const registrySizeBeforeSave = concordRegistry.size;

    expect(saveGame()).toBe(true);

    // Wipe every piece of state the save blob covers, and set it to clearly
    // different values, so a passing restore proves real repopulation
    // rather than a no-op against already-correct state.
    __resetPartyForTests();
    __resetStorageForTests();
    playerInventory.length = 0;
    concordRegistry.restore([]);
    setPlayerAppearance('female');
    setPlayerName('Someone Else');

    const blob = loadSaveBlob();
    expect(blob).not.toBeNull();
    restoreFromSaveBlob(blob!);

    expect(getPlayerAppearance()).toBe('male');
    expect(getPlayerName()).toBe('Kade');

    expect(getRoster().length).toBe(1);
    expect(getRoster()[0].fusion.genome).toEqual(active.genome);
    expect(getRoster()[0].fusion.phenotype).toEqual(active.phenotype);
    expect(getRoster()[0].currentHp).toBe(active.phenotype.stats.hp);
    expect(getActiveSlotIndex()).toBe(0);

    expect(getStorage().length).toBe(1);
    expect(getStorage()[0].genome).toEqual(boxed.genome);
    expect(getStorage()[0].phenotype).toEqual(boxed.phenotype);

    expect(playerInventory).toEqual([{ itemId: 'sample_kit', quantity: 3 }]);

    expect(concordRegistry.size).toBe(registrySizeBeforeSave);
  });

  it('restores an empty roster/storage/inventory the same way a fresh save of empty state would', () => {
    // Nothing added this test - roster/storage/inventory/registry all start empty via beforeEach.
    expect(saveGame()).toBe(true);

    addToRoster(makeFusion(20)); // dirty state that restore should wipe out
    depositToStorage(makeFusion(21));
    playerInventory.push({ itemId: 'verdant_salve', quantity: 1 });

    const blob = loadSaveBlob();
    restoreFromSaveBlob(blob!);

    expect(getRoster().length).toBe(0);
    expect(getActiveSlotIndex()).toBeNull();
    expect(getStorage().length).toBe(0);
    expect(playerInventory).toEqual([]);
  });
});
