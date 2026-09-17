/**
 * Item catalog. Empty for now - the inventory screen (src/scenes/InventoryScene.ts)
 * is built and reads from this catalog + the player's inventory
 * (src/state/inventory.ts) so real items can be added later without
 * touching the UI.
 */

export interface ItemDef {
  id: string;
  name: string;
  description: string;
}

export const ITEMS: ItemDef[] = [];

export const ITEMS_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
);
