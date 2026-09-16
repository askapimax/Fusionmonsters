/**
 * Larger world objects (trees, the field office) that sit on top of the
 * ground layer and span multiple tiles - real pixel art, same source/
 * license as tiles.ts (see public/assets/CREDITS.md).
 */

export type PropId = 'tree' | 'building';

export interface PropDef {
  id: PropId;
  name: string;
  textureKey: string;
  url: string;
  /** Footprint size in tiles, anchored at the placement's top-left tile. */
  footprintCols: number;
  footprintRows: number;
}

export const PROPS: Record<PropId, PropDef> = {
  tree: {
    id: 'tree',
    name: 'Tree',
    textureKey: 'prop-tree',
    url: 'assets/tiles/tree.png',
    footprintCols: 2,
    footprintRows: 2,
  },
  building: {
    id: 'building',
    name: 'Field Office',
    textureKey: 'prop-building',
    url: 'assets/tiles/building.png',
    footprintCols: 4,
    footprintRows: 4,
  },
};

export interface PropPlacement {
  type: PropId;
  /** Top-left tile of the prop's footprint. */
  col: number;
  row: number;
}
