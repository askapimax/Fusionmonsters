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
- [x] Tile catalog (`src/data/tiles.ts`): grass/flower/tall-grass/path/
      water/tree/wall/roof/door/sign, same pixel-art toolkit and pixel
      size as Fusion parts, each with a `solid` collision flag.
- [x] First zone map (`src/world/startingZone.ts`): a hand-laid 40x30
      "Fernbrook Outpost" - path, pond, tall-grass patches, a small
      Concord field office, tree border with a south gap.
- [x] Placeholder player character (`src/data/character.ts`): single
      default appearance, front/back/side pixel sprites (side mirrors for
      left/right).
- [x] `WorldScene` (`src/scenes/WorldScene.ts`, now the default boot
      scene): tile-grid movement (arrow keys/WASD), per-tile collision,
      camera follow with map bounds. Verified visually via headless
      browser (spawn, walking, direction-facing, and blocked-by-building
      collision all checked).

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
- [ ] The 32 parts are still placeholder pixel art (simple hand-authored
      silhouettes generated via `pixelArt.ts`, not a dedicated artist
      pass) - revisit once a final visual style/tile size for the
      overworld is locked in, so parts match it exactly.
- [ ] Design the actual overworld tileset/world graphics in the same
      pixel-art style, and confirm the parts' pixel size lines up with it.
- [ ] Sound effects / music.

### Engineering
- [ ] CI (typecheck + test on push).
- [ ] Code-split the Phaser bundle (currently a single ~1.5MB chunk per
      `npm run build`; fine for now, revisit before shipping).
