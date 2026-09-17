import type { PropPlacement } from '../data/props';
import type { ZoneId } from '../data/spawnTables';
import type { TileId } from '../data/tiles';
import * as fieldOfficeInterior from './fieldOfficeInterior';
import * as routeOneStub from './routeOneStub';
import * as fernbrookOutpost from './startingZone';
import type { ZoneExit, ZoneSpawn } from './zoneTypes';

/**
 * Zone registry (TODO "Zone-transition system" - the mechanism this task
 * adds). Each entry wraps one zone's map module's exports into a common
 * shape `WorldScene` can load generically, so the scene doesn't need to
 * know about any specific zone file directly. Existing zone files
 * (`startingZone.ts`) are untouched other than the new additive
 * `ZONE_EXITS` export - this registry just re-packages what's already
 * there, plus the new stub zone (`routeOneStub.ts`).
 */
export interface ZoneDef {
  zoneId: ZoneId;
  zoneName: string;
  cols: number;
  rows: number;
  spawn: ZoneSpawn;
  ground: TileId[][];
  props: PropPlacement[];
  exits: ZoneExit[];
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  fernbrook_outpost: {
    zoneId: fernbrookOutpost.ZONE_ID,
    zoneName: fernbrookOutpost.ZONE_NAME,
    cols: fernbrookOutpost.MAP_COLS,
    rows: fernbrookOutpost.MAP_ROWS,
    spawn: fernbrookOutpost.SPAWN,
    ground: fernbrookOutpost.STARTING_ZONE_GROUND,
    props: fernbrookOutpost.STARTING_ZONE_PROPS,
    exits: fernbrookOutpost.ZONE_EXITS,
  },
  // Placeholder second zone - see routeOneStub.ts's file-level comment.
  route_one_stub: {
    zoneId: routeOneStub.ZONE_ID,
    zoneName: routeOneStub.ZONE_NAME,
    cols: routeOneStub.MAP_COLS,
    rows: routeOneStub.MAP_ROWS,
    spawn: routeOneStub.SPAWN,
    ground: routeOneStub.ROUTE_ONE_STUB_GROUND,
    props: routeOneStub.ROUTE_ONE_STUB_PROPS,
    exits: routeOneStub.ZONE_EXITS,
  },
  // The field office's interior - see fieldOfficeInterior.ts's file-level
  // comment (TODO "Make the Concord field office enterable").
  field_office_interior: {
    zoneId: fieldOfficeInterior.ZONE_ID,
    zoneName: fieldOfficeInterior.ZONE_NAME,
    cols: fieldOfficeInterior.MAP_COLS,
    rows: fieldOfficeInterior.MAP_ROWS,
    spawn: fieldOfficeInterior.SPAWN,
    ground: fieldOfficeInterior.FIELD_OFFICE_INTERIOR_GROUND,
    props: fieldOfficeInterior.FIELD_OFFICE_INTERIOR_PROPS,
    exits: fieldOfficeInterior.ZONE_EXITS,
  },
};
