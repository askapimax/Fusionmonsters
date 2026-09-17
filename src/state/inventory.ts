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
