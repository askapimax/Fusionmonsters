# Third-party art assets

Everything under `public/assets/` (as opposed to the procedurally-generated
Fusion monster parts in `src/data/parts.ts`, which are original) is real
pixel art sourced from the [Tuxemon project](https://github.com/Tuxemon/Tuxemon),
an open-source monster-fighting RPG. Tuxemon's own code is GPLv3, but its
art assets are tracked separately in its `ATTRIBUTIONS.md` and are largely
CC BY-SA 4.0 (some individual source pieces are CC BY or public domain,
compiled into CC BY-SA 4.0 sheets) - that's the license these files carry
here, independent of this repository's own Apache-2.0 code license.

| File | Source | Attribution |
|---|---|---|
| `tiles/grass.png`, `tiles/tall_grass.png` (derived: color/brightness adjusted), `tiles/path.png`, `tiles/water.png`, `tiles/tree.png` | Tuxemon `mods/tuxemon/gfx/tilesets/Basic_Buch_Tiles_Compiled.png` ("Basic Buch Tiles", `core_outdoor`/`core_outdoor_nature` family) | Buch, commissioned by luke83; changes/additions by luke83 and Past the Future. CC BY-SA 4.0. |
| `tiles/building.png` (cropped, minor cleanup of adjacent-tile bleed) | Tuxemon `mods/tuxemon/gfx/tilesets/KelvinShadewing_Buildings.png` ("Kelvin Buildings" / Set Pieces) | Kelvin Shadewing (kelvinshadewing.net). Licensed under the XYG Open Source License v1.1 per Tuxemon's `ATTRIBUTIONS.md`. |
| `sprites/adventurer.png` | Tuxemon `mods/tuxemon/sprites/adventurer.png` (overworld NPC template sheet) | Tuxemon project (tuxemon.org) / contributors listed in `ATTRIBUTIONS.md`. Not individually itemized by filename there; the project's character-sprite assets are collectively CC BY-SA 4.0, which is the license applied here. |

Source repository: https://github.com/Tuxemon/Tuxemon (see its own
`ATTRIBUTIONS.md` for full per-asset detail).

If you redistribute these specific files (not the rest of this repo's
original code/art), you must comply with their license: CC BY-SA 4.0 for
the tile/tall_grass/path/water/tree/character assets (attribution + share
derivatives under the same license), and the XYG Open Source License v1.1
for `building.png`.
