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
- [x] On-screen D-pad controls (`index.html`, `src/input/touchControls.ts`)
      and a responsive canvas (`Phaser.Scale.FIT`, top-aligned) - playable
      by touch on mobile and by click or keyboard on desktop. Verified with
      Playwright's iPhone 13 device emulation and a real (non-instant)
      held touch press, since a synthetic `.tap()` turned out to be faster
      than Phaser's update loop and gave a false negative.
- [x] Fixed mobile browsers pushing the control bar off-screen: `100vh`
      doesn't account for a collapsible address bar. `index.html` now
      measures the real visible height via `window.innerHeight` (kept
      current on resize/orientationchange). Verified the mechanism by
      overriding `innerHeight` to a smaller value than the CSS viewport
      before page scripts ran, since Playwright's emulated viewport has
      no real address-bar-driven vh/innerHeight gap to reproduce directly.
- [x] Game Boy-style Start button (`index.html`, next to the D-pad; also
      bound to Enter on keyboard) opening a pause menu
      (`src/scenes/PauseMenuScene.ts`): INVENTORY, SAVE (present but
      intentionally inert - shows "Not available yet."), CLOSE.
- [x] Inventory screen (`src/scenes/InventoryScene.ts`), Pokemon-bag-style
      empty item grid, plus the data it reads from
      (`src/data/items.ts` - empty item catalog, `src/state/inventory.ts` -
      empty player inventory) and a shared UI panel style
      (`src/ui/panel.ts`) reused by both menu screens. Verified the full
      flow via headless browser: open via Enter and via the Start button,
      confirmed a second Enter press closes rather than double-opening,
      SAVE's notice appears and auto-dismisses without closing the menu,
      opening/closing Inventory returns cleanly to gameplay, and movement
      still works afterward (menu doesn't leave input stuck).
- [x] On-screen A/B buttons (`index.html`, `src/input/touchControls.ts`;
      Z/X on keyboard) plus real D-pad-navigable menus: the pause menu
      (`src/scenes/PauseMenuScene.ts`) now has a `>` cursor moved with
      Up/Down (arrow keys or the D-pad, edge-triggered so one press moves
      one slot), A/Enter confirms the highlighted option, B/Esc backs out
      and closes the menu. Mouse/touch-on-the-label still works directly
      too and keeps the keyboard cursor in sync (hovering a label selects
      it). Inventory gained a B-button/X-key back action to match; it has
      no grid cursor yet since there's nothing in it to select (tracked
      below). Verified via headless browser: Up/Down moves the cursor
      between all three options and wraps correctly, A confirms the
      selected option, the real on-screen B button (dispatched pointer
      events, not a synthetic tap) closes the menu, and movement still
      works after every close path.

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
- [ ] Save/load (local storage first, per README Tech Stack). The pause
      menu already has a SAVE entry (`src/scenes/PauseMenuScene.ts`) -
      it currently just shows "Not available yet." and needs real
      save-state logic wired in.
- [ ] Decide on and build the game's main menu / UI shell.
- [ ] Actual items in `src/data/items.ts` and ways to obtain them - the
      inventory screen is built and correctly renders whatever's there,
      but nothing populates it yet. Once there are items, give the
      inventory grid the same D-pad cursor + A/B handling the pause menu
      has (`src/scenes/InventoryScene.ts` only has a B-button back action
      so far - there's nothing to move a cursor between yet).

### Art & Audio
- [x] Re-polished the procedural Fusion-part generator (`pixelArt.ts`):
      parts are now built from overlapping ellipses with automatic
      perimeter outlining and position-based highlight/shadow shading,
      instead of hand-typed blocky pixel grids - much closer in polish
      to the real Tuxemon-sourced world/character art. Still procedural
      by necessity (parts must stay independently swappable for
      breeding), so a real monster-sprite artist pass is still an
      option later, but the gap with the rest of the art is much
      smaller now. Verified via the same catalog-preview + full-Phaser-
      texture-pipeline check as the world art got.
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
- [x] CI + deploy: `.github/workflows/deploy-pages.yml` runs typecheck +
      test + build on every push to the default branch, then publishes
      to the `gh-pages` branch. Live at
      https://askapimax.github.io/Fusionmonsters/ once the one manual
      Settings → Pages step (see README "Playing it online") is done.
- [ ] **Manual step needed, not something a push can do**: in the
      repo's Settings → Pages, set Source to "Deploy from a branch" /
      `gh-pages` / root - only after the workflow has run at least once
      (it creates the branch).
- [ ] Code-split the Phaser bundle (currently a single ~1.5MB chunk per
      `npm run build`; fine for now, revisit before shipping).
