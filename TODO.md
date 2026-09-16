# TODO

Project task tracker for Fusionmonsters. See [README.md](README.md) for the
story/mechanics these tasks implement. Keep this updated as work lands —
move items between sections rather than letting this drift out of sync with
reality.

## Done

- [x] Repo scaffolding: README (story + mechanics), Apache 2.0 LICENSE,
      `.gitignore`.
- [x] Project scaffolding: TypeScript + Vite + Phaser 3, `npm run dev` /
      `build` / `typecheck` / `test`.
- [x] Part catalog (`src/data/parts.ts`): 8 heads, 8 bodies, 8 legs, 8 wings
      (incl. "none"), each a retro pixel-art sprite (via the
      `src/render/pixelArt.ts` toolkit: outlined silhouettes, a consistent
      4-tone palette per part, short/stubby Pokemon-style leg proportions)
      + dominance rank + rarity weight + stat modifiers.
- [x] Type catalog (`src/data/types.ts`): 9 breedable types in an
      effectiveness cycle + mutation-only `void` type.
- [x] Move catalog (`src/data/moves.ts`): 3 moves per type, one recessive
      "hidden move" each.
- [x] Trait catalog (`src/data/traits.ts`): 6 dominant/recessive trait loci
      (12 traits).
- [x] Genetics engine (`src/genetics/genome.ts`, `breeding.ts`):
      `createFounderGenome`, `breed()` with per-locus meiosis, dominance
      expression, polygenic stat summing, and independent mutation per
      locus (incl. rare `void` corruption roll).
- [x] `ConcordRegistry` (`src/genetics/registry.ts`): fingerprints a
      Fusion's discrete traits and tracks discovery counts.
- [x] SVG compositor (`src/render/compositeSprite.ts`): layers inherited
      parts onto shared anchors with per-individual cosmetic jitter.
- [x] Debug Phaser scene (`src/scenes/CatalogPreviewScene.ts`) proving the
      full catalog → genome → breeding → phenotype → texture pipeline
      end to end, verified visually via a headless-browser render.
- [x] Vitest suite for the breeding engine (dominance, mutation bounds,
      dual-type carrier behavior, registry de-duplication).
- [x] Tile catalog (`src/data/tiles.ts`) and prop catalog
      (`src/data/props.ts`): grass/tall-grass/path/water tiles plus
      tree/field-office props, each with a `solid`/footprint collision
      flag. Real pixel art from the Tuxemon project (public/assets/,
      see CREDITS.md), not procedurally generated - swapped out after
      the first procedural-tile pass looked too rough.
- [x] First zone map (`src/world/startingZone.ts`): a hand-laid 40x30
      "Fernbrook Outpost" - path, pond, tall-grass patches, a small
      Concord field office, scattered trees.
- [x] Placeholder player character (`src/data/character.ts`): single
      default appearance, real 4-direction x 3-frame walk-cycle
      spritesheet (Tuxemon "adventurer"), animated while moving.
- [x] `WorldScene` (`src/scenes/WorldScene.ts`, now the default boot
      scene): tile-grid movement (arrow keys/WASD) with walk animation,
      per-tile + per-prop-footprint collision, camera follow zoomed 3x
      with map bounds. Verified visually via headless browser at every
      step (spawn, walking, direction-facing, collision, and a full
      zoomed-out map render to catch a tall-grass texture bug before
      it shipped).

## To Do

### World & Exploration
- [ ] Character creation flow (male/female appearance, name entry) - the
      player currently spawns with one fixed default look.
- [ ] Starter-Fusion selection at story start.
- [ ] More zones/routes beyond Fernbrook Outpost, and a way to travel
      between them (the current map's south gap doesn't lead anywhere
      yet).
- [ ] NPCs, dialogue, and making the field office enterable (it's
      currently a solid decorative block).
- [ ] Walk animation (the character currently just slides tile-to-tile
      with a static per-direction pose, no leg-cycle frames).

### Spawns & Encounters
- [ ] Per-zone spawn tables (which Fusions can appear, with individual
      spawn-probability weights — see README "Spawns & Named Bosses").
- [ ] Global 2-minute respawn timer for regular mobs.
- [ ] Named-boss system: unique hand-placed Fusions per dungeon/zone with
      guaranteed special loot and their own (longer, currently
      placeholder) respawn timers.
- [ ] Design the actual named bosses per zone and their loot tables (not
      just the system — the content itself).
- [ ] Wild-encounter → capture flow (weaken, throw a sample kit, catch-rate
      math).

### Battling
- [ ] Turn-based battle scene/UI.
- [ ] Damage formula using type effectiveness (`getTypeEffectiveness`),
      stats, and move power/accuracy.
- [ ] Status effects referenced by move `effect` text (poison, paralysis,
      burn, stat buffs/debuffs) — currently only described in data, not
      implemented.
- [ ] Trainer (rival/Chimera Nine) battles vs. wild battles.
- [ ] Party management (up to 6 Fusions, switching, fainting).

### Breeding UI & Progression
- [ ] In-game breeding UI (pick two compatible Fusions, produce an egg,
      hatch into a new Fusion using the existing `breed()` engine).
- [ ] Egg/hatching flow and timing.
- [ ] Concord registry UI (browse discovered signatures/species).
- [ ] Bastion structure: regional gym-equivalents, specialist battles,
      story gating.
- [ ] Story content: Chimera Nine encounters, the Unraveling plot beats.

### Persistence & Platform
- [ ] Save/load (local storage first, per README Tech Stack).
- [ ] Decide on and build the game's main menu / UI shell.

### Art & Audio
- [ ] The 32 Fusion parts are still procedurally-generated pixel art
      (simple hand-authored silhouettes via `pixelArt.ts`), which now
      looks noticeably rougher than the real Tuxemon-sourced world/
      character art. Worth either commissioning/finding real monster
      sprites to match, or deliberately re-polishing the generator.
- [ ] The world tiles/props/character are borrowed from another project
      (Tuxemon, CC BY-SA 4.0 / XYG license - see public/assets/CREDITS.md)
      as a stand-in. Fine for prototyping, but a real game needs either a
      license-compliant release story for these exact files or original
      replacements before shipping.
- [ ] Only 4 ground tiles + 2 props exist (grass/tall grass/path/water,
      tree/field office). No dedicated sign, fence, second building, or
      any indoor tileset yet.
- [ ] Sound effects / music.

### Engineering
- [ ] CI (typecheck + test on push).
- [ ] Code-split the Phaser bundle (currently a single ~1.5MB chunk per
      `npm run build`; fine for now, revisit before shipping).
