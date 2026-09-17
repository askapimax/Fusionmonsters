import type { FacingDirection } from './character';

/**
 * NPC data model (TODO.md "World & Exploration" - NPC entity system). A
 * `NpcDef` is a static, placed NPC: a fixed facing direction and a line or
 * two of dialogue, shown via `DialogueScene` when the player faces it and
 * presses A/Z (see `WorldScene.checkInteraction`/`maybeTalkToNpc`).
 *
 * There's no NPC-specific pixel art in `public/assets/` (only the shared
 * player "adventurer" sheet - see `src/data/character.ts`), so each NPC
 * reuses that same spritesheet, rendered statically (no walk animation) at
 * its `facing` direction's idle frame, and gets a Phaser tint to look
 * visually distinct from the player and from other NPCs - the same
 * honest stand-in approach `character.ts`'s `APPEARANCE_TINTS` already
 * uses for the player's own cosmetic appearance choice. `tint: null` means
 * no tint (the sheet's original colors).
 *
 * Catalog (this file) vs. placement (`STARTING_ZONE_NPCS` in
 * `src/world/startingZone.ts`) mirrors the trainer split in
 * `src/data/trainers.ts`/`STARTING_ZONE_TRAINERS`: an NPC's identity/
 * dialogue lives here, where it's placed in the world lives in the zone
 * file.
 */
export interface NpcDef {
  id: string;
  name: string;
  /** Which way the NPC is posed facing - purely a static sprite frame, it
   * never turns or walks. */
  facing: FacingDirection;
  /** Applied via `sprite.setTint(...)` on the shared character sheet, or
   * `null` for no tint. See file comment above. */
  tint: number | null;
  /** Shown one at a time in `DialogueScene` when the player interacts. */
  lines: string[];
}

const NPC_LIST: NpcDef[] = [
  {
    id: 'fernbrook_field_tech',
    name: 'Field Tech Bram',
    facing: 'down',
    tint: 0x6fbf73,
    lines: [
      'Bram: Welcome to Fernbrook Outpost, Splicer.',
      "Bram: The field office is right behind me if you ever need to check in with the Concord.",
      "Bram: Stay sharp out there - the Unraveling's been showing up closer to the Reach than anyone would like.",
    ],
  },
  // Staffs the field office's interior (TODO "Make the Concord field office
  // enterable") - see `FIELD_OFFICE_INTERIOR_NPCS` in
  // `src/world/fieldOfficeInterior.ts`.
  {
    id: 'concord_field_registrar',
    name: 'Registrar Wren',
    facing: 'down',
    tint: 0x8f6fbf,
    lines: [
      'Wren: Welcome in - this is Fernbrook Outpost\'s Concord field office.',
      'Wren: That console against the wall doubles as our med-bay terminal - step up to it any time your Fusion needs patching up.',
      "Wren: Keep logging your sightings out there. Every registry entry helps us track the Unraveling's spread.",
    ],
  },
];

export const NPCS: Record<string, NpcDef> = Object.fromEntries(NPC_LIST.map((npc) => [npc.id, npc]));

export type NpcId = (typeof NPC_LIST)[number]['id'];
