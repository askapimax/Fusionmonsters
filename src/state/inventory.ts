/**
 * The player's held items. Empty for now (no items exist in the catalog
 * yet) - InventoryScene reads this so it already renders real (if empty)
 * state rather than a hardcoded placeholder.
 */

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export const playerInventory: InventoryEntry[] = [];
