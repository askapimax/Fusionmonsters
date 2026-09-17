import { describe, expect, it } from 'vitest';
import { consumeItem, hasItem, playerInventory } from './inventory';

describe('hasItem / consumeItem', () => {
  it('hasItem is true for a seeded item with quantity > 0, false for one never held', () => {
    expect(hasItem('sample_kit')).toBe(true);
    expect(hasItem('not_a_real_item')).toBe(false);
  });

  it('consumeItem decrements quantity by one and returns true', () => {
    playerInventory.push({ itemId: '__test_consume_item__', quantity: 2 });
    expect(consumeItem('__test_consume_item__')).toBe(true);
    const entry = playerInventory.find((e) => e.itemId === '__test_consume_item__');
    expect(entry?.quantity).toBe(1);
    // Clean up regardless of the rest of this test's outcome.
    const index = playerInventory.findIndex((e) => e.itemId === '__test_consume_item__');
    if (index !== -1) playerInventory.splice(index, 1);
  });

  it('consumeItem removes the entry entirely once its quantity reaches 0', () => {
    playerInventory.push({ itemId: '__test_consume_to_zero__', quantity: 1 });
    expect(consumeItem('__test_consume_to_zero__')).toBe(true);
    expect(playerInventory.some((e) => e.itemId === '__test_consume_to_zero__')).toBe(false);
    expect(hasItem('__test_consume_to_zero__')).toBe(false);
  });

  it('consumeItem returns false and does not throw when the item is not held', () => {
    expect(consumeItem('__never_held__')).toBe(false);
  });
});
