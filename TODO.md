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
- [x] Wild-encounter roll on tall-grass tiles (`TILES[...].encounterZone`,
      `src/data/wildEncounters.ts`): each step onto one has a flat 12%
      chance to start a battle against a freshly-generated random founder
      Fusion. Wired into `WorldScene.maybeTriggerEncounter`, called from
      the movement-tween's `onComplete` so it can never fire mid-step or
      while a menu/battle is already open.
- [x] Per-zone spawn tables (`src/data/spawnTables.ts`,
      `ZONE_SPAWN_TABLES`): each zone weights which primary types are
      common vs. rare there (same weighted-random pattern the part
      catalog uses for `rarityWeight`), passed through
      `generateWildFusion`'s new `spawnTable` param into
      `createFounderGenome`'s existing `forcedPrimaryType` option.
      Fernbrook Outpost's table favors flora/aqua and makes
      thermal/mineral/photon rare. Parts/traits/moves/stats are still
      fully random within whichever type gets rolled — only the type is
      zone-biased so far. Vitest suite in `spawnTables.test.ts` covers
      the weighting and the fallback to a fully random type when no
      table is given.
- [ ] Global 2-minute respawn timer for regular mobs — moot until there's
      something zone-persistent to respawn; current wild Fusions are
      generated fresh per encounter and don't exist in the world otherwise.
- [ ] Named-boss system: unique hand-placed Fusions per dungeon/zone with
      guaranteed special loot and their own (longer, currently
      placeholder) respawn timers.
- [ ] Design the actual named bosses per zone and their loot tables (not
      just the system — the content itself).
- [ ] Wild-encounter → capture flow (weaken, throw a sample kit, catch-rate
      math). A wild encounter currently only ends in a win, a loss, or
      running away — there's no way to keep the Fusion you just fought.

### Battling
- [x] Turn-based battle scene/UI (`src/scenes/BattleScene.ts`), in the
      same dark-panel/monospace style as the rest of the UI: Pokemon-style
      layout (wild top-right on its own platform, player bottom-left,
      flipped to face it), name/type + animated HP bar panels for both,
      and a message box that advances on A/Enter/click - matching the
      D-pad/A/B navigation the pause menu already has (`src/ui/panel.ts`
      reused directly). A 2-column move grid (up to 4 moves + RUN AWAY)
      replaces the message box once it's the player's turn; RUN AWAY
      always succeeds (no capture/party system yet to make failure
      meaningful - see above). Simple tween-based "juice": an intro
      fade-in, an attack lunge, a hit-flash + camera shake, and an
      animated HP-bar drain.
- [x] Damage formula using type effectiveness (`getTypeEffectiveness`),
      stats, and move power/accuracy, plus same-type-attack-bonus and a
      basic status-effect layer (heal / stat-stage buffs+debuffs /
      burn+poison damage-over-time / a paralysis skip chance) mapped from
      each type's hidden move — see `src/battle/battleEngine.ts` and
      `src/battle/moveEffects.ts`, with a dedicated Vitest suite
      (`battleEngine.test.ts`, 18 tests). The damage divisor and status
      magnitudes are placeholder balance, not final tuning, and status
      conditions only last for the current battle (nothing persists
      outside it, e.g. into the overworld or a later encounter).
- [ ] Trainer (rival/Chimera Nine) battles vs. wild battles - only wild
      battles exist so far.
- [ ] Party management (up to 6 Fusions, switching, fainting). The player
      currently has exactly one battling Fusion, auto-assigned the first
      time a battle is needed (`src/state/party.ts`) since there's no
      starter-selection flow yet either (same "skip the unbuilt flow"
      shortcut WorldScene already took for character creation) - no
      selection, no roster, no switching mid-battle.
- [ ] No leveling/XP - by design, a Fusion's power comes from its genome
      (breeding), not from grinding battles, so winning currently grants
      no numeric reward at all beyond the win itself. Losing heals the
      player's Fusion back to full and returns them to the field, since
      there's no Fusion-Center-equivalent healing economy yet to make a
      loss otherwise recoverable - a deliberate safety net, not the
      intended long-term design.

### Breeding UI & Progression
- [ ] In-game breeding UI (pick two compatible Fusions, produce an egg,
      hatch into a new Fusion using the existing `breed()` engine). **When
      this lands, wire its output into `concordRegistry.register(...)`
      too** (see below) - bred offspring don't register yet since this
      doesn't exist.
- [ ] Egg/hatching flow and timing.
- [x] Concord registry UI (`src/scenes/ConcordRegistryScene.ts`): browses
      every distinct signature discovered so far, in the same dark-panel/
      monospace style as `InventoryScene` (reuses `drawPanel`/`drawSlot`/
      `UI_THEME`) - a scrollable list of rows (type(s), part names,
      `timesDiscovered`), a running "N signatures discovered" count, and
      the same empty-state message when nothing's been found yet. Opens
      from a new REGISTRY entry in the pause menu
      (`src/scenes/PauseMenuScene.ts`). The registry itself is now a real
      app-wide singleton (`src/state/registry.ts`, `concordRegistry`,
      mirroring the `party.ts`/`inventory.ts` singleton pattern) with two
      writers: `WorldScene.maybeTriggerEncounter` registers every wild
      sighting, and `party.ts#getPlayerFusion` registers the player's own
      Fusion the first time it's assigned. `ConcordRegistry` itself
      (`src/genetics/registry.ts`) is unchanged; `CatalogPreviewScene`
      still uses its own separate throwaway instance for its debug demo.
      Verified end to end via headless browser: walked into tall grass
      until a wild encounter fired, ran away, opened the registry and
      confirmed it showed "2 signatures discovered" (the wild sighting +
      the player's own Fusion). Follow-ups below.
- [ ] Registry: no per-entry drill-down/cursor yet (Up/Down only scrolls
      the list) - fine while entries are short, but add a
      cursor + confirm affordance if a future "view full stats/moves for
      this signature" detail screen is wanted.
- [ ] Registry: no sorting/filtering (e.g. by type) yet - revisit once the
      discovered-signature list gets long.
- [ ] Registry: state is in-memory only, same as `party.ts`/`inventory.ts`
      - resets on page reload until Save/load (below) lands and persists
      it too.
- [ ] Registry: currently registers on every wild *sighting* (each
      encounter roll), not on catch, since there's no capture system yet
      (see "Wild-encounter → capture flow" above). Worth revisiting
      whether sight-based or catch-based registration is the right call
      once capture lands.
- [ ] Bastion structure: regional gym-equivalents, specialist battles,
      story gating.
- [ ] Story content: Chimera Nine encounters, the Unraveling plot beats.

### Persistence & Platform
- [ ] Save/load (local storage first, per README Tech Stack). The pause
      menu already has a SAVE entry (`src/scenes/PauseMenuScene.ts`) -
      it currently just shows "Not available yet." and needs real
      save-state logic wired in.
- [ ] Decide on and build the game's main menu / UI shell.
- [x] Actual items in `src/data/items.ts` and a real starting inventory:
      a small first-pass catalog (`src/data/items.ts`) - Verdant Salve and
      Concord Stim-Canister (heal items, `healFraction` 0.3/0.6, same
      fraction-of-max-HP unit `moveEffects.ts`'s `verdant_regrowth` heal
      already uses), Neutralizing Draught (cures burn/poison/paralysis,
      the same status ids the battle engine uses), and a Sample Kit
      explicitly labeled as an inert placeholder for the not-yet-built
      capture flow. `playerInventory` (`src/state/inventory.ts`) is now
      seeded with a small starting kit by default, so the bag is
      genuinely populated rather than always empty. `InventoryScene` got
      the same D-pad cursor + A/B handling the pause menu has, adapted to
      a 2D grid: Up/Down/Left/Right move a highlighted cursor (clamped,
      not wrapped, at the grid edges), A/Enter/Z shows the selected
      item's name + description in the panel. `src/data/items.test.ts`
      covers catalog integrity and the starting kit. Verified end to end
      via headless browser (real items render with quantities, cursor
      moves correctly, confirming shows the description text, closing
      returns to the world cleanly). Follow-ups below.
- [ ] Items: no way to actually *use*/consume an item yet, in battle or
      the overworld - confirming a slot only shows info text. A real
      "use item" system (apply heal/cure effects, decrement quantity)
      is separate future work.
- [ ] Items: no acquisition system beyond the fixed starting kit - no
      shop, NPCs, or loot drops exist yet (falls out of the NPCs/world
      TODO above once that lands).
- [ ] Items: heal fractions (0.3 / 0.6) are placeholder balance chosen for
      consistency with the one existing move-heal value, not tuned
      against a real economy.

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
- [x] Code-split the Phaser bundle: `vite.config.ts` now routes Phaser
      into its own `manualChunks` vendor chunk, separate from app code.
      App code dropped from ~1.52MB to ~50KB (a ~30x reduction) and can
      now be redeployed/cached independently of the Phaser vendor chunk.
      Config-only change - no source files touched. The Phaser vendor
      chunk itself (~1.48MB) still trips Vite's 500kB warning, which is
      inherent to the library and not something further config-only
      splitting addresses. Verified: `npm run build` output inspected
      before/after, typecheck/tests/build all still pass after merge.
- [ ] Lazy-load non-initial scenes (`PauseMenuScene`, `InventoryScene`,
      `BattleScene`, `ConcordRegistryScene`) via dynamic `import()` in
      `src/main.ts` once it isn't being concurrently edited elsewhere -
      the app chunk still bundles all scenes eagerly even though only
      `WorldScene` is needed at boot. Needs real `npm run dev` + manual
      scene-launch verification before landing, not just a code read.
- [ ] `src/scenes/CatalogPreviewScene.ts` (the debug catalog→genome→
      breeding→phenotype→texture pipeline scene) is fully built but not
      referenced anywhere in `src/main.ts` - dead code from the bundle's
      perspective. Either wire it in behind a debug flag/route or remove
      it.
