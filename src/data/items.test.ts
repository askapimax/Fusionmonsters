import { describe, expect, it } from 'vitest';
import { ITEMS, ITEMS_BY_ID } from './items';
import { playerInventory } from '../state/inventory';

describe('ITEMS', () => {
  it('is a small, non-empty catalog', () => {
    expect(ITEMS.length).toBeGreaterThan(0);
    expect(ITEMS.length).toBeLessThanOrEqual(6);
  });

  it('has no duplicate ids', () => {
    const ids = ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every item a non-empty name and description', () => {
    for (const item of ITEMS) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });

  it('resolves every item id in ITEMS_BY_ID back to the matching item', () => {
    for (const item of ITEMS) {
      expect(ITEMS_BY_ID[item.id]).toBe(item);
    }
  });

  it('keeps heal amounts expressed as a 0-1 fraction of max HP, matching moveEffects.ts', () => {
    for (const item of ITEMS) {
      if (item.effect.kind === 'heal') {
        expect(item.effect.healFraction).toBeGreaterThan(0);
        expect(item.effect.healFraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it('includes at least one healing item and one capture-placeholder item', () => {
    expect(ITEMS.some((item) => item.effect.kind === 'heal')).toBe(true);
    expect(ITEMS.some((item) => item.effect.kind === 'placeholder')).toBe(true);
  });
});

describe('playerInventory (starting kit)', () => {
  it('is seeded with at least one entry', () => {
    expect(playerInventory.length).toBeGreaterThan(0);
  });

  it('only references item ids that exist in the catalog', () => {
    for (const entry of playerInventory) {
      expect(ITEMS_BY_ID[entry.itemId]).toBeDefined();
    }
  });

  it('never gives a non-positive quantity', () => {
    for (const entry of playerInventory) {
      expect(entry.quantity).toBeGreaterThan(0);
    }
  });

  it('has no duplicate item ids (each item appears in at most one slot)', () => {
    const ids = playerInventory.map((entry) => entry.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
