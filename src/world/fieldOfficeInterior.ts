import type { PropPlacement } from '../data/props';
import type { ZoneId } from '../data/spawnTables';
import type { TileId } from '../data/tiles';
import type { NpcPlacement } from './startingZone';
import type { ZoneExit } from './zoneTypes';

/**
 * The Concord field office's interior (TODO.md "World & Exploration" -
 * "Make the Concord field office enterable"). Reached via the field
 * office's doorstep tile in Fernbrook Outpost (see
 * `startingZone.ts#ZONE_EXITS`) through the same generic zone-transition
 * mechanism `routeOneStub.ts` proves out - an "interior" needs no dedicated
 * Phaser Scene class, just another entry in `../world/zones.ts`'s `ZONES`
 * registry that `WorldScene` loads via `this.scene.restart(...)`.
 *
 * This is a small, hand-laid single room proving the door/interior
 * mechanism, not a fully designed field office - see TODO.md. There's no
 * dedicated indoor tileset yet (see TODO.md "Art & Audio" - "Additional
 * world tiles/props"), so the floor reuses the existing `path` ground tile
 * as an explicit placeholder, the same honest stand-in spirit
 * `routeOneStub.ts` uses for its own placeholder content. The room has no
 * wall tiles either (no indoor wall art exists yet) - like Fernbrook
 * itself, which has no border walls, the map edges alone bound movement
 * (see `WorldScene.isWalkable`).
 *
 * This is also where the healing marker moved to per TODO.md ("The outdoor
 * healing marker below should move inside once this exists") - see
 * `HEALING_SPOT` below, relocated from `startingZone.ts` - and where the
 * field office's one interior NPC is placed (`FIELD_OFFICE_INTERIOR_NPCS`).
 */

export const ZONE_ID: ZoneId = 'field_office_interior';
export const ZONE_NAME = 'Concord Field Office';
export const MAP_COLS = 7;
export const MAP_ROWS = 6;

// One tile inside the room's south-edge door (see ZONE_EXITS below), so
// arriving doesn't immediately re-trigger the walk back out - mirrors
// routeOneStub.ts's SPAWN/ZONE_EXITS relationship to its own return exit.
export const SPAWN = { col: 3, row: 4 };

/**
 * The relocated "Fusion Center" healing marker - previously `HEALING_SPOT`
 * in `startingZone.ts`, standing outdoors only because this interior didn't
 * exist yet (see that file's git history / TODO.md). Placed at the back of
 * the room, like a med-bay counter. Same interaction shape as before: face
 * it and press Z/on-screen-A (`WorldScene.checkInteraction`) to fully
 * restore the active Fusion's HP via `healPlayerFully()`.
 */
export const HEALING_SPOT = { col: 4, row: 1 };

function buildGround(): TileId[][] {
  // Uniform placeholder floor - see file-level comment above.
  return Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 'path' as TileId),
  );
}

// No multi-tile props yet - just the healing counter and NPC below, both
// handled directly by WorldScene the same way Fernbrook's healing marker/
// NPCs are. Kept as its own function/export for symmetry with
// routeOneStub.ts/startingZone.ts's shape.
function buildProps(): PropPlacement[] {
  return [];
}

export const FIELD_OFFICE_INTERIOR_GROUND: TileId[][] = buildGround();
export const FIELD_OFFICE_INTERIOR_PROPS: PropPlacement[] = buildProps();

/**
 * NPC placement for this zone (mirrors `STARTING_ZONE_NPCS` in
 * `startingZone.ts`) - a Concord registrar staffing the field office,
 * demonstrating the NPC-interaction system works inside a zone transitioned
 * into, not just the starting one.
 */
function buildNpcs(): NpcPlacement[] {
  return [{ npcId: 'concord_field_registrar', col: 2, row: 1 }];
}

export const FIELD_OFFICE_INTERIOR_NPCS: NpcPlacement[] = buildNpcs();

/**
 * The door back out to Fernbrook Outpost, at the south edge of the room -
 * lands one tile south of the doorstep tile that leads in here (see
 * `startingZone.ts#ZONE_EXITS`), so walking out doesn't immediately bounce
 * back in - the same round-trip pattern `routeOneStub.ts#ZONE_EXITS` uses.
 */
export const ZONE_EXITS: ZoneExit[] = [
  { col: 3, row: MAP_ROWS - 1, targetZoneId: 'fernbrook_outpost', targetSpawn: { col: 19, row: 8 } },
];
