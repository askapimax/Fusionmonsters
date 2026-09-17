# TODO

Project task tracker for Fusionmonsters. See [README.md](README.md) for the
story/mechanics these tasks implement. Keep this updated as work lands —
move items between sections rather than letting this drift out of sync with
reality.

Each unchecked item below is scoped to be doable as a single, self-contained
task (one PR, one agent session) — big features are broken into the smaller
pieces that build up to them rather than listed as one giant bullet. Items
within a section are roughly in the order they unblock each other; later
sections generally depend on earlier ones (e.g. breeding UI wants a real
party/storage system first, capture wants a roster to put caught Fusions
into).

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
      (`src/scenes/PauseMenuScene.ts`): INVENTORY, REGISTRY, SAVE (present
      but intentionally inert - shows "Not available yet."), CLOSE.
- [x] Inventory screen (`src/scenes/InventoryScene.ts`), Pokemon-bag-style
      item grid with a real starting catalog and a D-pad cursor - see
      "Starter item catalog + inventory grid interaction" below (Persistence
      & Platform) for details.
- [x] On-screen A/B buttons (`index.html`, `src/input/touchControls.ts`;
      Z/X on keyboard) plus real D-pad-navigable menus: the pause menu
      (`src/scenes/PauseMenuScene.ts`) now has a `>` cursor moved with
      Up/Down (arrow keys or the D-pad, edge-triggered so one press moves
      one slot), A/Enter confirms the highlighted option, B/Esc backs out
      and closes the menu. Mouse/touch-on-the-label still works directly
      too and keeps the keyboard cursor in sync (hovering a label selects
      it). Verified via headless browser: Up/Down moves the cursor
      between all options and wraps correctly, A confirms the
      selected option, the real on-screen B button (dispatched pointer
      events, not a synthetic tap) closes the menu, and movement still
      works after every close path.
- [x] Wild-encounter roll on tall-grass tiles (`TILES[...].encounterZone`,
      `src/data/wildEncounters.ts`): each step onto one has a flat 12%
      chance to start a battle against a freshly-generated random founder
      Fusion. Wired into `WorldScene.maybeTriggerEncounter`, called from
      the movement-tween's `onComplete` so it can never fire mid-step or
      while a menu/battle is already open.
- [x] Per-zone spawn tables (`src/data/spawnTables.ts`, `ZONE_SPAWN_TABLES`):
      each zone weights which primary types are common vs. rare there (same
      weighted-random pattern the part catalog uses for `rarityWeight`),
      passed through `generateWildFusion`'s `spawnTable` param into
      `createFounderGenome`'s `forcedPrimaryType` option. Fernbrook
      Outpost's table favors flora/aqua and makes thermal/mineral/photon
      rare. Parts/traits/moves/stats are still fully random within
      whichever type gets rolled - only the type is zone-biased so far, and
      it's still one weighted-type-list per zone rather than real
      type/part "species" presets. Vitest suite in `spawnTables.test.ts`
      covers the weighting and the fallback to a fully random type when no
      table is given.
- [x] Turn-based battle scene/UI (`src/scenes/BattleScene.ts`), in the
      same dark-panel/monospace style as the rest of the UI: Pokemon-style
      layout (wild top-right on its own platform, player bottom-left,
      flipped to face it), name/type + animated HP bar panels for both,
      and a message box that advances on A/Enter/click - matching the
      D-pad/A/B navigation the pause menu already has (`src/ui/panel.ts`
      reused directly). A 2-column move grid (up to 4 moves + RUN AWAY)
      replaces the message box once it's the player's turn; RUN AWAY
      always succeeds (no capture/party system yet to make failure
      meaningful - see Battling below). Simple tween-based "juice": an
      intro fade-in, an attack lunge, a hit-flash + camera shake, and an
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
- [x] CI + deploy: `.github/workflows/deploy-pages.yml` runs typecheck +
      test + build on every push to the default branch, then publishes
      to the `gh-pages` branch. Live at
      https://askapimax.github.io/Fusionmonsters/ once the one manual
      Settings → Pages step (see README "Playing it online") is done.
- [x] Concord registry UI (`src/scenes/ConcordRegistryScene.ts`): browses
      every distinct signature discovered so far, in the same dark-panel/
      monospace style as `InventoryScene` (reuses `drawPanel`/`drawSlot`/
      `UI_THEME`) - a scrollable list of rows (type(s), part names,
      `timesDiscovered`), a running "N signatures discovered" count, and
      the same empty-state message when nothing's been found yet. Opens
      from a REGISTRY entry in the pause menu
      (`src/scenes/PauseMenuScene.ts`). The registry is a real app-wide
      singleton (`src/state/registry.ts`, `concordRegistry`, mirroring the
      `party.ts`/`inventory.ts` singleton pattern) with two writers today:
      `WorldScene.maybeTriggerEncounter` registers every wild sighting, and
      `party.ts#getPlayerFusion` registers the player's own Fusion the
      first time it's assigned - bred offspring don't register yet since
      breeding UI doesn't exist (wire it in when that lands, see Breeding
      UI & Progression below). `ConcordRegistry` itself
      (`src/genetics/registry.ts`) is unchanged; `CatalogPreviewScene`
      still uses its own separate throwaway instance for its debug demo.
      Verified end to end via headless browser: walked into tall grass
      until a wild encounter fired, ran away, opened the registry and
      confirmed it showed "2 signatures discovered." No per-entry cursor/
      drill-down or sorting/filtering yet (Up/Down only scrolls); state is
      in-memory only until Save/load lands; currently registers on every
      wild *sighting*, not on catch (see Capture flow below - worth
      revisiting once that exists).
- [x] Starter item catalog + inventory grid interaction: a small first-pass
      item catalog (`src/data/items.ts`) - Verdant Salve and Concord
      Stim-Canister (heal items, `healFraction` 0.3/0.6, same
      fraction-of-max-HP unit `moveEffects.ts`'s `verdant_regrowth` heal
      already uses), Neutralizing Draught (cures burn/poison/paralysis,
      the same status ids the battle engine uses), and a Sample Kit
      explicitly labeled as an inert placeholder for the not-yet-built
      capture flow. `playerInventory` (`src/state/inventory.ts`) is seeded
      with a small starting kit by default (given at the start rather than
      via a shop/NPC, which don't exist yet), so the bag is genuinely
      populated. `InventoryScene` has the same D-pad cursor + A/B handling
      the pause menu has, adapted to a 2D grid: Up/Down/Left/Right move a
      highlighted cursor (clamped, not wrapped, at the grid edges), A/Enter
      shows the selected item's name + description in the panel (no
      "use"/consume action wired up yet - see below). `src/data/items.test.ts`
      covers catalog integrity and the starting kit. Verified end to end
      via headless browser. Follow-ups: no way to actually *use*/consume an
      item yet in battle or the overworld (apply heal/cure effects,
      decrement quantity - separate future work); no acquisition system
      beyond the fixed starting kit besides what NPCs/shops (see World &
      Exploration below) will eventually provide; heal fractions (0.3/0.6)
      are placeholder balance, not tuned against a real economy.
- [x] Code-split the Phaser bundle: `vite.config.ts` routes Phaser into its
      own `manualChunks` vendor chunk, separate from app code. App code
      dropped from ~1.52MB to ~50KB and can now be redeployed/cached
      independently of the Phaser vendor chunk. Config-only change - no
      source files touched. The Phaser vendor chunk itself (~1.48MB) still
      trips Vite's 500kB warning, inherent to the library. Follow-ups:
      lazy-loading non-initial scenes (`PauseMenuScene`, `InventoryScene`,
      `BattleScene`, `ConcordRegistryScene`) via dynamic `import()` in
      `src/main.ts` is a further optimization, needs real `npm run dev` +
      manual scene-launch verification before landing; `CatalogPreviewScene`
      is fully built but not referenced anywhere in `src/main.ts` - dead
      code from the bundle's perspective, worth wiring in behind a debug
      flag or removing.

## To Do

### World & Exploration
- [ ] Character creation scene: pick male/female appearance (cosmetic
      only, per README) and enter a name, shown once before `WorldScene`
      boots. Store the choice (e.g. a small `src/state/player.ts`) and use
      it to pick which spritesheet `src/data/character.ts` hands to the
      player object, instead of `WorldScene` always spawning the single
      hardcoded default look.
- [ ] Starter-Fusion selection flow: a small screen/scene (e.g. presented
      at the field office) offering a handful of founder Fusions to pick
      from at story start, writing the choice into the party system below
      instead of `src/state/party.ts` auto-assigning a random founder the
      first time a battle happens.
- [ ] Zone-transition system: a data-driven way for a map to declare exit
      tiles that load a different zone at a specific spawn tile/facing
      (extends `src/world/startingZone.ts`'s map format and
      `WorldScene`'s tile/collision loading to support more than one
      map). This is the mechanism only - Fernbrook Outpost's south gap
      currently leads nowhere because nothing consumes it yet.
- [ ] A second zone (new hand-laid map using the tile/prop catalogs, plus
      its own wild-encounter tall-grass patches) connected to Fernbrook
      Outpost's south exit via the transition system above.
- [ ] Dialogue box UI system: a reusable scrolling text-box component
      (own scene or an overlay usable from `WorldScene`) in the existing
      dark-panel/monospace style (`src/ui/panel.ts`), advancing one
      message at a time on A/Enter/click - the same interaction pattern
      `BattleScene`'s message box already uses, factored out so NPCs,
      signs, and story beats can all reuse it instead of each rebuilding
      message-queue logic.
- [ ] NPC entity system: place static NPCs on a zone map (sprite + facing
      direction + a line or two of dialogue), block their tile like a
      prop, and let the player interact with one by facing it and
      pressing A, triggering the dialogue box above.
- [ ] Make the Concord field office enterable: an interior scene/room
      (small hand-laid indoor map) that the field-office prop's door tile
      transitions into/out of via the zone-transition system, with at
      least one NPC inside using the interaction system above.

### Spawns & Encounters
- [ ] Persistent wild-Fusion world entities: place specific wild Fusion
      instances on a zone map with their own alive/defeated state
      (rendered on the map, not just rolled on step-in), so there's
      something concrete for a respawn timer to act on. Battling one
      removes it from the map instead of the current fresh-Fusion-per-
      encounter behavior.
- [ ] Global 2-minute respawn timer for the persistent wild-Fusion
      entities above: a defeated/caught one reappears exactly 2 minutes
      later (flat, no per-species/zone tuning per README).
- [ ] Named-boss system (mechanism, not content): a way to hand-place a
      unique Fusion on a zone map that always drops guaranteed special
      loot on defeat and uses its own (longer than 2-minute, configurable
      per boss) respawn timer, separate from the regular-mob system
      above.
- [ ] Design and place the first named boss (or two) for Fernbrook
      Outpost using the system above: pick its Fusion build, its
      guaranteed-loot table entry (rare part / guaranteed-dominant allele
      / unique cosmetic variant per README), and its respawn timer value.
- [ ] Capture flow: a "sample kit" item usable from the battle move menu
      (alongside/instead of a move), a catch-rate formula scaled by the
      wild Fusion's remaining HP%, status condition, and the kit's
      strength (`src/battle/battleEngine.ts` has the HP/status state this
      needs), and on success add the caught Fusion to the player's roster
      (see Party management below) instead of the battle only ever ending
      in win/loss/run.

### Battling
- [ ] Trainer-battle type: a data model for a trainer NPC (party of one+
      Fusions) reusing the NPC interaction system to trigger a battle via
      `BattleScene`, distinct from a wild encounter in that RUN AWAY isn't
      offered (matching real trainer-battle conventions) and the intro/
      outcome messages read as a trainer fight rather than "a wild Fusion
      appeared."
- [ ] Party roster data layer: extend `src/state/party.ts` from a single
      auto-assigned Fusion to a real list of up to 6, with add (from
      starter selection, capture, or hatching), remove/release, and
      reorder operations that other systems (capture, breeding, starter
      selection) can call.
- [ ] In-battle switching: once the roster above holds more than one
      Fusion, add a SWITCH option to `BattleScene`'s move menu and a
      forced-switch prompt when the active Fusion faints instead of the
      battle ending immediately in a loss.
- [ ] A healing location or item (a "Fusion Center" equivalent - e.g. an
      NPC/object in the field office that fully restores the active
      Fusion's HP and clears status) so that losing a battle can
      eventually stop being a free full-heal safety net once capture/
      party stakes exist - `BattleScene.loseBattle` currently always
      full-heals for exactly this reason.

### Breeding UI & Progression
- [ ] Fusion storage ("box") system: a place to keep Fusions beyond the
      6-slot active roster (caught/bred Fusions exceeding party capacity
      need somewhere to go), plus a simple browse/withdraw/deposit screen
      in the existing panel UI style.
- [ ] In-game breeding UI: a screen to pick two compatible Fusions (same
      breeding group, per README) from the roster/storage above and
      produce an egg by calling the existing `breed()` engine
      (`src/genetics/breeding.ts`) - the engine itself is done and
      tested, only the picking-two-parents UI and egg creation are
      missing. **Register the bred offspring into `concordRegistry`**
      (`src/state/registry.ts`) when this lands - see the Concord registry
      UI item above.
- [ ] Egg/hatching flow: an egg item/entity holding a bred genome, a
      hatch timer (steps walked or real time), and conversion into a
      real `Fusion` added to the roster/storage on hatch, with at least a
      simple on-screen notification when it happens.
- [ ] First Bastion: a zone location with a signature-Fusion-specialist
      trainer battle (using the trainer-battle system above) that sets a
      story-progress flag on defeat, gating whatever content comes next.
- [ ] First Chimera Nine story encounter: a scripted dialogue + trainer
      battle beat (using the dialogue and trainer-battle systems above)
      tied to a story flag, establishing the antagonist in-game rather
      than only in README lore. Further story beats/Bastions are follow-
      on tasks of the same shape once this one exists.

### Persistence & Platform
- [ ] Save/load via `localStorage`: serialize the player's position/zone,
      appearance/name, roster + storage, inventory, registry, and story
      flags into one save blob, wire real logic into the pause menu's
      existing SAVE entry (`src/scenes/PauseMenuScene.ts`, currently
      "Not available yet."), and load it back on boot when present. Best
      attempted once roster/storage/character-creation/story-flags exist
      to actually serialize - premature before then.
- [ ] Title screen / main menu scene shown before `WorldScene` boots:
      New Game (starts character creation) and Continue (loads the save
      above, only enabled/shown when one exists).

### Art & Audio
- [ ] Resolve the Tuxemon asset situation before shipping: either write
      up a license-compliant redistribution/attribution story for the
      exact CC BY-SA 4.0 files in `public/assets/` (see
      `public/assets/CREDITS.md`), or commission/produce original
      replacements for the world tiles/props/character art.
- [ ] Additional world tiles/props: at minimum a sign, a fence, a second
      building, and a basic indoor tileset (needed by the field-office
      interior and second-zone tasks above, which currently have nothing
      indoor to build with).
- [ ] Background music: one overworld track and one battle track, looped,
      with a mute/volume toggle somewhere in the UI (e.g. the pause menu).
- [ ] Sound effects: menu move/confirm/back, a step sound, and battle hits/
      faint/catch cues.

### Engineering
- [ ] **Manual step needed, not something a push can do**: in the
      repo's Settings → Pages, set Source to "Deploy from a branch" /
      `gh-pages` / root - only after the workflow has run at least once
      (it creates the branch).
- [ ] Lazy-load non-initial scenes (`PauseMenuScene`, `InventoryScene`,
      `BattleScene`, `ConcordRegistryScene`) via dynamic `import()` in
      `src/main.ts` - the app chunk still bundles all scenes eagerly even
      though only `WorldScene` is needed at boot (see the code-split entry
      above). Needs real `npm run dev` + manual scene-launch verification
      before landing, not just a code read.
- [ ] Wire `src/scenes/CatalogPreviewScene.ts` in behind a debug flag/route,
      or remove it - it's fully built but not referenced anywhere in
      `src/main.ts`, dead code from the bundle's perspective.
