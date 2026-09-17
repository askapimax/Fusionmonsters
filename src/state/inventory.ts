/**
 * The player's held items. Seeded with a small starting kit (module-level
 * initialization, matching the singleton-state style `src/state/party.ts`
 * already uses) so `InventoryScene` renders real, testable content by
 * default instead of the always-empty placeholder it started as. There's
 * still no acquisition system beyond this starting kit (no shop, no loot
 * drops, no NPCs - see TODO.md) - that's separate future work.
 */

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export const playerInventory: InventoryEntry[] = [
  { itemId: 'verdant_salve', quantity: 3 },
  { itemId: 'concord_stim_canister', quantity: 1 },
  { itemId: 'neutralizing_draught', quantity: 2 },
  { itemId: 'sample_kit', quantity: 5 },
];

/** Whether the player currently holds at least one of `itemId`. */
export function hasItem(itemId: string): boolean {
  return playerInventory.some((entry) => entry.itemId === itemId && entry.quantity > 0);
}

/**
 * Consumes one unit of `itemId` from the inventory (the capture flow's
 * Sample Kit use, `BattleScene`'s only caller today). The slot's quantity
 * is decremented, and the entry is removed entirely once it hits 0 -
 * matching how a real bag drops an emptied slot rather than showing "x0".
 * Returns whether anything was actually consumed (`false` if none was held).
 */
export function consumeItem(itemId: string): boolean {
  const index = playerInventory.findIndex((entry) => entry.itemId === itemId && entry.quantity > 0);
  if (index === -1) {
    return false;
  }
  playerInventory[index].quantity -= 1;
  if (playerInventory[index].quantity <= 0) {
    playerInventory.splice(index, 1);
  }
  return true;
}
