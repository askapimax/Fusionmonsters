/**
 * Item catalog. A first real pass - small and deliberately not a full
 * economy (see TODO.md's "Persistence & Platform" section). Two healing
 * items, one status-cure item, and one honest placeholder for the
 * not-yet-built capture flow. `src/scenes/InventoryScene.ts` reads this
 * catalog + the player's inventory (`src/state/inventory.ts`) to render
 * the bag grid.
 *
 * None of these items can actually be *used* yet - there's no "use item"
 * system in battle or the overworld (that's separate future work, same as
 * capture). Selecting a slot in the inventory just shows the item's name
 * and description, like a real Pokemon bag's info line, rather than
 * pretending to apply an effect that doesn't exist.
 */

export type ItemEffect =
  /**
   * Fraction of a Fusion's max HP restored, expressed in the same unit
   * `MoveEffect`'s `heal` kind uses (src/battle/moveEffects.ts) - compare
   * `verdant_regrowth`'s 0.3 amount. Keeping the unit consistent means a
   * future item-use system can feed this straight into the same healing
   * math the battle engine already runs, rather than inventing a second
   * scale. Not consumed by anything yet.
   */
  | { kind: 'heal'; healFraction: number }
  /**
   * Which battle status conditions this item is meant to cure. Mirrors
   * the status ids `MoveEffect`'s `status` kind uses. Not consumed by
   * anything yet - there's no way to apply an item mid-battle.
   */
  | { kind: 'cure'; statuses: Array<'burn' | 'poison' | 'paralysis'> }
  /** Explicitly does nothing yet - a placeholder for unbuilt game systems. */
  | { kind: 'placeholder' };

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  effect: ItemEffect;
}

export const ITEMS: ItemDef[] = [
  {
    id: 'verdant_salve',
    name: 'Verdant Salve',
    description:
      'A field dressing infused with regenerative flora compounds, standard-issue to every Splicer. Restores a modest portion of a Fusion\'s HP.',
    effect: { kind: 'heal', healFraction: 0.3 },
  },
  {
    id: 'concord_stim_canister',
    name: 'Concord Stim-Canister',
    description:
      'A pressurized canister of concentrated cellular stimulant, reserved for serious field injuries. Restores a large portion of a Fusion\'s HP.',
    effect: { kind: 'heal', healFraction: 0.6 },
  },
  {
    id: 'neutralizing_draught',
    name: 'Neutralizing Draught',
    description:
      'A bitter Concord-lab draught formulated to flush burns, toxins, and static charge from a Fusion\'s system.',
    effect: { kind: 'cure', statuses: ['burn', 'poison', 'paralysis'] },
  },
  {
    id: 'sample_kit',
    name: 'Sample Kit',
    description:
      "A Concord-issued kit for field-sampling a weakened wild Fusion. Doesn't do anything yet - the capture flow hasn't been built (see TODO.md).",
    effect: { kind: 'placeholder' },
  },
];

export const ITEMS_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
);
