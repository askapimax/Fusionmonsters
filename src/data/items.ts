/**
 * Item catalog. A first real pass - small and deliberately not a full
 * economy (see TODO.md's "Persistence & Platform" section). Two healing
 * items, one status-cure item, and a Sample Kit that now really does drive
 * the capture flow (`BattleScene`'s SAMPLE KIT move-menu option, catch-rate
 * math in `src/battle/battleEngine.ts`). `src/scenes/InventoryScene.ts`
 * reads this catalog + the player's inventory (`src/state/inventory.ts`) to
 * render the bag grid.
 *
 * The heal/cure items still can't actually be *used* outside the inventory
 * screen yet - there's no "use item" system for them in battle or the
 * overworld (separate future work). Selecting one there just shows its name
 * and description. The Sample Kit is the one exception: it's consumed from
 * `BattleScene`'s move menu, not from here.
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
  /**
   * Marks an item as a capture device usable from the battle move menu
   * against a wild Fusion (never a trainer's). `strength` feeds directly
   * into `computeCatchChance`'s `kitStrength` multiplier
   * (`src/battle/battleEngine.ts`) - 1.0 is a baseline Sample Kit; a future
   * stronger/weaker kit variant can just use a different number here
   * without touching the catch-rate formula itself.
   */
  | { kind: 'capture'; strength: number };

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
      "A Concord-issued kit for field-sampling a weakened wild Fusion. Usable from the battle move menu against a wild Fusion (not a trainer's) - the lower its remaining HP and the more destabilized its condition, the better the odds of a successful sample.",
    effect: { kind: 'capture', strength: 1 },
  },
];

export const ITEMS_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
);
