import type { NpcId } from '../data/npcs';
import type { PropPlacement } from '../data/props';
import type { ZoneId } from '../data/spawnTables';
import type { TileId } from '../data/tiles';
import type { TrainerId } from '../data/trainers';
import type { ZoneExit } from './zoneTypes';

/**
 * The game's first zone: "Fernbrook Outpost", a small Concord waystation at
 * the edge of the Reach. This is where a new Splicer's journey begins -
 * see README.md "Setting" / "Player's role". Layout, prop placement, and
 * tall-grass patches here are a first pass, not final level design.
 */

export const ZONE_ID: ZoneId = 'fernbrook_outpost';
export const ZONE_NAME = 'Fernbrook Outpost';
export const MAP_COLS = 40;
export const MAP_ROWS = 30;

export const SPAWN = { col: 20, row: 9 };

// The outdoor healing marker that used to live here (`HEALING_SPOT`, just
// outside the field office's door) has moved inside now that the field
// office is enterable (TODO "Make the Concord field office enterable") -
// see `HEALING_SPOT` in `./fieldOfficeInterior.ts`.

function buildGround(): TileId[][] {
  const map: TileId[][] = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => 'grass' as TileId),
  );

  const set = (row: number, col: number, tile: TileId): void => {
    if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
      map[row][col] = tile;
    }
  };

  const rect = (row0: number, col0: number, row1: number, col1: number, tile: TileId): void => {
    for (let row = row0; row <= row1; row++) {
      for (let col = col0; col <= col1; col++) {
        set(row, col, tile);
      }
    }
  };

  // The path from the field office's door down to the south gap.
  rect(8, 20, MAP_ROWS - 1, 21, 'path');

  // Tall-grass patches (future wild-encounter zones - not wired up yet).
  rect(10, 10, 12, 12, 'tall_grass');
  rect(15, 27, 17, 29, 'tall_grass');
  rect(20, 8, 22, 10, 'tall_grass');

  // A small pond.
  rect(8, 30, 9, 33, 'water');

  return map;
}

function buildProps(): PropPlacement[] {
  const props: PropPlacement[] = [
    // The Concord field office the player starts in front of.
    { type: 'building', col: 18, row: 3 },
  ];

  // Trees scattered around the clearing (deliberately not a solid border -
  // there's no wall around Fernbrook, just open ground fading into
  // unimplemented content past the map edges).
  const treeSpots: Array<[number, number]> = [
    [2, 2], [5, 6], [8, 3], [3, 34], [6, 30], [10, 36],
    [14, 4], [18, 2], [22, 4], [26, 2],
    [24, 34], [20, 36], [16, 34],
    [26, 15], [26, 22],
  ];
  for (const [row, col] of treeSpots) {
    props.push({ type: 'tree', col, row });
  }

  return props;
}

export const STARTING_ZONE_GROUND: TileId[][] = buildGround();
export const STARTING_ZONE_PROPS: PropPlacement[] = buildProps();

/**
 * A trainer-battle trigger placed on the map (TODO.md "Battling" -
 * Trainer-battle type). There's no real NPC-interaction system yet (a
 * separate, not-yet-built TODO item), so this is a simple standalone
 * stand-in: a single world tile that starts a trainer battle the first
 * time the player steps onto it, deterministically (not a per-step random
 * roll like wild-encounter tall grass) - see
 * `WorldScene.maybeTriggerTrainerBattle`. Swap this for a real NPC-facing
 * interaction once that system exists.
 */
export interface TrainerPlacement {
  trainerId: TrainerId;
  col: number;
  row: number;
}

function buildTrainers(): TrainerPlacement[] {
  return [
    // Open grass well clear of the path, pond, tall-grass patches, and
    // tree footprints above.
    { trainerId: 'fernbrook_scout', col: 30, row: 24 },
  ];
}

export const STARTING_ZONE_TRAINERS: TrainerPlacement[] = buildTrainers();

/**
 * NPC placements (TODO.md "World & Exploration" - NPC entity system). Each
 * entry places one catalog entry from `src/data/npcs.ts` at a fixed tile;
 * `WorldScene` renders it as a static sprite, blocks its tile like a prop,
 * and lets the player talk to it by facing it and pressing A/Z (see
 * `WorldScene.buildNpcs`/`maybeTalkToNpc`). Kept Fernbrook-only for now,
 * the same way `STARTING_ZONE_TRAINERS` above is - NPCs aren't part of the
 * generic `ZoneDef` shape yet (see `../world/zones.ts`). This interface is
 * also reused by `./fieldOfficeInterior.ts`'s own NPC placement list.
 */
export interface NpcPlacement {
  npcId: NpcId;
  col: number;
  row: number;
}

function buildNpcs(): NpcPlacement[] {
  return [
    // Just southwest of the field office's door - clear of the building
    // footprint and the path.
    { npcId: 'fernbrook_field_tech', col: 17, row: 7 },
  ];
}

export const STARTING_ZONE_NPCS: NpcPlacement[] = buildNpcs();

/**
 * Persistent wild-Fusion world-entity placements (TODO.md "Spawns &
 * Encounters" - Persistent wild-Fusion world entities / Global 2-minute
 * respawn timer). Each entry fixes a spot on the map where a specific wild
 * Fusion (generated once and kept stable across its respawns - see
 * `src/world/wildFusionState.ts`) stands, rendered as its own composited
 * sprite via `WorldScene.buildWildFusions`, rather than the per-step random
 * roll tall-grass tiles already do. `id` keys that persistent state, so
 * don't reuse or rename an id once placed (it'd re-roll a fresh Fusion and
 * lose the old one's alive/defeated state). Kept Fernbrook-only for now,
 * the same way `STARTING_ZONE_TRAINERS`/`HEALING_SPOT`/`STARTING_ZONE_NPCS`
 * above are - not part of the generic `ZoneDef` shape yet.
 */
export interface WildFusionPlacement {
  id: string;
  col: number;
  row: number;
}

function buildWildFusionPlacements(): WildFusionPlacement[] {
  return [
    // Three spots on open grass, checked against the path (cols 20-21),
    // the pond (rows 8-9, cols 30-33), all three tall-grass patches, the
    // field office's 4x4 footprint, every tree's 2x2 footprint, and the
    // healing spot/trainer/NPC placements above - clear of all of them.
    { id: 'fernbrook_wild_1', col: 13, row: 20 },
    { id: 'fernbrook_wild_2', col: 33, row: 20 },
    { id: 'fernbrook_wild_3', col: 8, row: 25 },
  ];
}

export const STARTING_ZONE_WILD_FUSIONS: WildFusionPlacement[] = buildWildFusionPlacements();

/**
 * Zone-transition exits (TODO "Zone-transition system" - mechanism only).
 * Additive to this file's existing map format: stepping onto one of these
 * tiles sends the player to `targetZoneId` at `targetSpawn`. The south gap
 * in the path (see `buildGround` above, which runs the path to
 * `MAP_ROWS - 1` without anything beyond it) now leads to
 * `route_one_stub`, a tiny placeholder zone that exists only to prove this
 * mechanism works end to end - see `src/world/routeOneStub.ts` and
 * `src/world/zones.ts`. The real second zone is a separate follow-on TODO
 * item.
 *
 * The two exit tiles are the two path columns (20, 21) at the southern
 * edge (row `MAP_ROWS - 1`). Target spawns land one tile *inside*
 * route_one_stub's border rather than exactly on its own return exit, so
 * walking south doesn't immediately bounce back north.
 */
export const ZONE_EXITS: ZoneExit[] = [
  { col: 20, row: MAP_ROWS - 1, targetZoneId: 'route_one_stub', targetSpawn: { col: 5, row: 1 } },
  { col: 21, row: MAP_ROWS - 1, targetZoneId: 'route_one_stub', targetSpawn: { col: 6, row: 1 } },
  // The field office's doorstep (TODO "Make the Concord field office
  // enterable"): the field office prop occupies cols 18-21, rows 3-6 (see
  // STARTING_ZONE_PROPS/PROPS.building), fully blocked, so there's no
  // carved-out "door tile" in the footprint itself - instead the open grass
  // tile immediately south of it acts as the doorstep. Stepping onto it
  // transitions into the interior (`./fieldOfficeInterior.ts`), landing one
  // tile in from its own door. Column 19 is clear of the existing NPC
  // placement (17, 7) above.
  { col: 19, row: 7, targetZoneId: 'field_office_interior', targetSpawn: { col: 3, row: 4 } },
];
