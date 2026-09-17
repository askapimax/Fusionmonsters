# Fusionmonsters

A browser-based 2D creature-collecting RPG. You explore an overworld, catch
wild engineered creatures ("Fusions"), battle with them, and breed them
together to produce offspring that inherit stats, moves, and traits from
their parents according to a dominant/recessive gene system.

This document is the single source of truth for the game's story and
mechanics. Anyone (human or AI) picking up this project should be able to
read this file and understand what the game is and how its systems fit
together, without needing to ask.

## Status

Pre-alpha. The procedural monster catalogs (parts/types/moves/traits) and
the breeding/genetics engine are implemented and tested (see
[Procedural Graphics & Data Catalogs](#procedural-graphics--data-catalogs-implemented)
below), and there's now a title screen, real character creation, and a
starter-Fusion pick flowing into a first playable zone (see
[The First Zone: Fernbrook Outpost](#the-first-zone-fernbrook-outpost-implemented)),
connected via a zone-transition mechanism to a placeholder second zone and
an enterable field-office interior, static NPCs you can talk to, both wild
and trainer battles, a working capture flow, persistent wild-Fusion world
entities with a 2-minute respawn timer, a roster + overflow storage system
with in-battle switching, a breeding UI, and save/load via `localStorage` -
but still no egg/hatching flow, named bosses, or real second-zone content.
See [TODO.md](TODO.md) for the current task breakdown. Design decisions
below are the accepted direction for the game as of this writing, not
aspirational/optional ideas.

## Elevator Pitch

The world's ecosystems were rebuilt after ecological collapse using
engineered creatures called Fusions. A century later those Fusions are woven
into everyday life — and into every regional economy. You're a newly
certified field handler heading out to catalog, capture, battle, and breed
Fusions, right as a genetic corruption event starts turning wild populations
feral and threatening to unravel the ecosystems all over again.

## Setting

**The Reach** is the game's region: a stretch of engineered biomes — reclaimed
wetlands, vertical algae farms, mineral flats, climate-controlled greenbelts —
built after **the Collapse**, a near-total ecological failure that made most
of the old world briefly uninhabitable.

Recovery was only possible because of **Helix Dynamics**, the corporation
that pioneered gene-splicing technology to create **Fusions**: engineered
creatures designed to re-stabilize soil, water, and air cycles far faster
than unassisted nature could. Fusions bred, spread, and diversified far beyond
their original designs, and within a generation they'd stopped being tools
and became wildlife, working animals, companions, and — inevitably —
battlers and collectibles.

Fusion populations are now overseen by **the Concord**, a neutral
scientific/regulatory guild that certifies field handlers (**Splicers**),
maintains regional research **Bastions**, and keeps a public genetic
registry of every known Fusion lineage.

### The threat: the Unraveling

A rogue, self-propagating gene sequence — nicknamed **the Unraveling** — has
started appearing in wild Fusion populations. It doesn't just mutate an
individual; it rewrites germline genes so corruption breeds true and spreads.
Corrupted Fusions become aggressive, unstable, and ecologically destructive —
echoing the exact failure mode that caused the original Collapse. Left
unchecked, it will collapse the Reach's ecosystems a second time, for good.

The Concord believes the sequence isn't a natural mutation — it has hallmarks
of deliberate engineering. Suspicion centers on **Chimera Nine**, a splinter
faction of ex-Helix researchers who believe unstable, rapidly-mutating
genetics should be weaponized and sold rather than suppressed, and who
you'll run into disrupting Bastions and manipulating wild populations
throughout the story.

### Player's role

You are a newly-certified Splicer. Officially, your job is fieldwork:
capture and catalog Fusions, register lineages, and — because breeding
stable, healthy Fusions is the Concord's main tool for out-competing and
displacing corrupted populations — build and improve your own bloodlines.
Unofficially, your travels keep putting you in the middle of Chimera Nine's
plans, and stopping the Unraveling becomes the game's main story arc.
Progressing through the Reach's regional Bastions (this game's answer to
gyms) runs in parallel with, and eventually converges on, that story.

## Character Creation

- Choose an appearance for your character: male or female presentation
  (cosmetic only — no mechanical differences between them).
- Choose a name.
- You start with a starter Fusion given to you at a Bastion at story start.

Character creation itself is now real (`src/scenes/CharacterCreationScene.ts`,
`src/state/player.ts`) - see the next section. `npm run dev` now boots into
a title screen first (`src/scenes/TitleScreenScene.ts`: NEW GAME starts
character creation; CONTINUE loads a real save via `localStorage` when one
exists, see "Progression" below, and is otherwise disabled). Character
creation now hands off into a real starter-selection screen
(`src/scenes/StarterSelectionScene.ts`, picking one of 3 fixed founder
Fusions) before the world loads, rather than the roster auto-assigning a
random founder on first battle. Name entry has no effect beyond being
stored yet (NPCs now exist to talk to, but none reference the player's
name), and since there's no second character spritesheet, appearance is a
Phaser tint on the one shared sheet rather than genuinely different art
(see next section).

## The First Zone: Fernbrook Outpost (implemented)

The game's actual starting point: a small Concord waystation at the edge of
the Reach, implemented as a real playable (if content-light) zone rather
than just described here - see `src/world/startingZone.ts` and
`src/scenes/WorldScene.ts`. This is what `npm run dev` currently boots into.

- A hand-laid 40x30 tile map: grass, a dirt path, a small pond, three
  tall-grass patches (wild-encounter zones, see "Spawns & Named Bosses"
  below), and a small Concord field office the player starts right in
  front of, plus scattered trees. The map's south gap now connects to a
  second zone via the zone-transition system (see "World & Exploration"
  in TODO.md) - currently just a tiny, explicitly-placeholder "Route 1"
  stub proving the mechanism, not real level design yet. A static NPC
  (`src/data/npcs.ts`, `WorldScene`'s NPC-interaction system) stands near
  the field office with a line of dialogue - face it and press the
  interact button (Z/on-screen-A) to talk. The field office itself is now
  enterable (`src/world/fieldOfficeInterior.ts`): its doorstep, just south
  of the building, transitions into a small hand-laid interior room (no
  dedicated indoor tileset yet, so the floor reuses the outdoor path tile
  as a placeholder) with its own NPC and the relocated healing marker (see
  below). Three persistent wild-Fusion world entities also stand on open
  grass around Fernbrook (`WorldScene.buildWildFusions`) - see "Spawns &
  Named Bosses" below.
- Unlike the procedural Fusion parts, world art is **real pixel art**, not
  generated: `src/data/tiles.ts` (ground) and `src/data/props.ts` (trees,
  the field office - bigger multi-tile objects placed on top of the
  ground layer, listed per-instance in `src/world/startingZone.ts`) load
  actual PNGs from `public/assets/`, sourced from the open-source Tuxemon
  project. See `public/assets/CREDITS.md` for exact source/license per
  file (mostly CC BY-SA 4.0) - this is a different license than this
  repo's own Apache-2.0 code, so keep that file's terms in mind before
  redistributing those specific assets.
- The player character (`src/data/character.ts`) is likewise a real
  4-direction x 3-frame walk-cycle spritesheet from Tuxemon - one actual
  sheet, with the MALE/FEMALE choice from character creation applied as a
  Phaser tint (`APPEARANCE_TINTS`) rather than a second sheet, since only
  one exists (see "Player's role" above).
- Movement is classic tile-grid stepping (one tile per key-tap or per
  ~160ms while a direction is held) with a real walk animation while
  moving, per-tile collision (water and prop footprints block movement;
  grass/path/tall grass don't), and the camera follows the player,
  zoomed in 3x, with bounds clamped to the map edge.
- Controls: arrow keys/WASD, or the on-screen D-pad rendered below the
  game canvas (`index.html` + `src/input/touchControls.ts`) - always
  shown, not just on touch devices, so it's clickable on desktop too,
  not only via keyboard. The game canvas itself scales to fit the
  available space (`Phaser.Scale.FIT`, top-aligned so any leftover
  space collects next to the control bar instead of above the game
  view), so this works on both phone and desktop viewports.
- A Game Boy-style Start button sits next to the D-pad (also bound to
  Enter on keyboard) and opens a pause menu (`src/scenes/PauseMenuScene.ts`):
  INVENTORY, REGISTRY, STORAGE, BREED, SAVE, CLOSE. It's properly
  D-pad-navigable, not just clickable: Up/Down (arrow keys or the D-pad)
  move a `>` cursor between options, A (Z key or the on-screen A button)
  confirms the highlighted one, B (X key or the on-screen B button) backs
  out and closes the menu - the on-screen A/B buttons sit next to Start
  (`index.html`, `src/input/touchControls.ts`). Clicking/tapping a label
  directly still works too and keeps the keyboard cursor in sync. BREED
  opens the breeding UI (see "Breeding & Genetics" below) and SAVE now
  really serializes the game to `localStorage` (see "Progression" below) -
  both replace what used to be inert placeholders.
- INVENTORY opens `src/scenes/InventoryScene.ts`: a Pokemon-bag-style
  grid of item slots, in the same dark-panel/monospace UI style as the
  pause menu (`src/ui/panel.ts`). It's real, data-driven UI backed by a
  real (if still small) item catalog (`src/data/items.ts`: two heal items,
  a status-cure item, and a Sample Kit that's now a real, usable capture
  item - see "Catching Fusions" above) and a seeded starting inventory
  (`src/state/inventory.ts`). It's D-pad-navigable like the pause menu:
  Up/Down/Left/Right move a highlighted cursor around the grid (clamped,
  not wrapped, at the edges), A/Enter/Z shows the selected item's name and
  description, B/X closes it. There's still no "use item" system in the
  overworld (only in battle, via the Sample Kit) - selecting a non-battle
  item is informational only for now.
- STORAGE opens `src/scenes/StorageScene.ts`: the same panel-grid style as
  INVENTORY, browsing the Fusion storage box (see "Progression" below) and
  withdrawing a selected Fusion into the active roster if there's room.
- REGISTRY opens `src/scenes/ConcordRegistryScene.ts`: a scrollable list
  of every distinct Fusion signature discovered so far (see "The Concord
  registry" under Progression below), same dark-panel/monospace style and
  open/close conventions as Inventory. The registry
  (`src/state/registry.ts`) has three writers today: every wild encounter
  (`WorldScene.maybeTriggerEncounter`), the player's own starter Fusion,
  and bred offspring (`src/scenes/BreedingScene.ts`) all register into it.
  Registry state now survives a reload via Save/load (see "Progression"
  below).
- BREED opens `src/scenes/BreedingScene.ts`: pick two parent Fusions from
  the combined roster + storage pool, and confirming produces a new,
  already-bred offspring Fusion via the existing `breed()` engine, added
  to the roster (or storage if the roster is full) - see "Breeding &
  Genetics" below for what this does and doesn't cover yet.

Run it: `npm install && npm run dev`.

## Core Gameplay Loop

1. Explore the overworld (towns, routes, wild areas) from a top-down 2D
   perspective.
2. Encounter and capture wild Fusions.
3. Battle other Splicers and wild Fusions in turn-based combat.
4. Breed captured Fusions to produce offspring with new combinations of
   inherited stats, types, moves, and traits.
5. Use stronger/better-bred Fusions to clear tougher story content: Bastions,
   Chimera Nine encounters, and end-game content dealing with the Unraveling.

## Battling

Turn-based combat, one Fusion active per side at a time (party of up to 6 -
see "First pass (implemented)" below for what's actually built today).
Each Fusion has:

- **Type(s)** — one or two elemental/biological types (e.g. Volt, Flora,
  Aqua, Toxin, Mineral, Thermal) with a rock-paper-scissors-style
  effectiveness chart between types.
- **Core stats** — HP, Attack, Defense, Focus (special attack), Resist
  (special defense), Speed.
- **Moves** — up to 4 equipped at a time, drawn from what its genome allows
  it to learn (see Genetics below).
- **A passive trait** — a single always-on ability (e.g. Regeneration,
  Camouflage, Venomous) inherited from its genome.

### First pass (implemented)

A real, playable 1v1 wild battle exists end to end
(`src/scenes/BattleScene.ts`, `src/battle/battleEngine.ts`,
`src/battle/moveEffects.ts`), in the same pixel-art/dark-panel style as the
rest of the UI, reachable by walking into tall grass (see
[Spawns & Named Bosses](#spawns--named-bosses) below). What's real vs. still
the design above:

- One Fusion actively battles per side, but the player can now switch to a
  different roster member mid-battle (`src/state/party.ts` holds a real
  up-to-6 roster, see "Party roster" under Progression below) - a
  voluntary SWITCH costs the turn, a forced switch on faint doesn't. The
  roster starts with a real player-picked starter Fusion (see "Character
  Creation" above) rather than an auto-assigned random founder.
- Damage uses type effectiveness, STAB, Physical (Attack/Defense) vs.
  Special (Focus/Resist) stats, and move accuracy, plus a working (if
  simplified) status layer: heals, +/-stat stages, burn/poison
  damage-over-time, and a paralysis skip chance, all mapped from each
  type's hidden move.
- Every step is animated: an intro fade-in, an attack lunge, a hit-flash +
  camera shake, and an HP bar that visibly drains rather than jumping.
- A wild battle now ends in a win, a capture (see "Catching Fusions"
  below), a loss (which fully heals the player and returns them to the
  field - the player can also heal proactively via a healing marker now
  inside the field office's interior, see "The First Zone" above), or
  running away (which always succeeds against a wild Fusion). Trainer
  battles now exist too (`src/data/trainers.ts`, `BattleScene`'s trainer
  mode) - no RUN AWAY or SAMPLE KIT option, trainer-flavored messages -
  triggered by a temporary standalone world trigger; a real NPC-interaction
  system now exists too (used for talking to static NPCs, see "The First
  Zone" above) but hasn't been swapped in for the trainer trigger yet. No
  leveling/XP - a Fusion's power is fixed by its genome, so winning grants
  no numeric reward beyond the win.

## Catching Fusions

Wild Fusions are encountered in the overworld. Weakening a wild Fusion in
battle and then using a capture item gives a chance to catch it, scaled by
remaining HP, status effects, and item strength — the familiar
weaken-then-throw-a-ball loop, renamed to fit the setting (capture devices
are Concord-issued "sample kits").

**Implemented**: a SAMPLE KIT move-menu option in wild battles
(`src/scenes/BattleScene.ts`, `src/battle/battleEngine.ts`'s
`computeCatchChance`/`attemptCapture`) - only offered when the player holds
one and never in trainer battles. A successful catch joins the active
roster, or Fusion storage if the roster is full; a failed one ("It broke
free!") gives the wild Fusion a real turn rather than a free pass. Catch-
rate constants are placeholder balance, not tuned.

## Spawns & Named Bosses

Wild-area encounters follow an EverQuest-style spawn model rather than a
single random-encounter roll per step:

- **Every regular (non-named) mob respawns exactly 2 minutes** after being
  caught or defeated. This is a flat, global rule — no per-species or
  per-zone tuning.
- Each zone/dungeon has its own **spawn table**: the set of Fusions that
  can appear there, each with its own spawn probability, so some species
  are common in a given zone and others are rare finds. (Mechanically this
  reuses the same weighted-random pattern the part catalog already uses
  for `rarityWeight` — see [Procedural Graphics & Data Catalogs](#procedural-graphics--data-catalogs-implemented).)
- Every dungeon/zone also has one or more **named bosses**: a unique,
  hand-placed Fusion (not just a leveled-up regular mob) that always drops
  **special, guaranteed loot** — a rare part, a guaranteed-dominant allele,
  or a unique cosmetic variant not obtainable from normal wild breeding.
  Named bosses are placeholders for now: which bosses exist, their exact
  loot tables, and their respawn timers (longer than the 2-minute standard,
  exact value TBD per boss) are not yet defined and need to be designed and
  tuned later.

**Implemented so far:** stepping onto a tall-grass tile
(`TILES[...].encounterZone` in `src/data/tiles.ts`) has a flat 12% chance
per step to start a battle (`src/data/wildEncounters.ts`,
`WorldScene.maybeTriggerEncounter`) against one freshly-generated random
founder Fusion. Per-zone spawn tables are wired up (`src/data/spawnTables.ts`,
`ZONE_SPAWN_TABLES`): each zone weights which primary types are common vs.
rare there, using the same weighted-random pattern as part `rarityWeight`.
Fernbrook Outpost favors flora/aqua and makes thermal/mineral/photon rare
finds. Parts/traits/moves/stats stay fully random within whichever type
gets rolled - only the primary type is zone-biased so far, and it's still
one table per zone rather than a per-species roster.

Separately, 3 persistent wild-Fusion world entities now stand on fixed
spots around Fernbrook (`src/world/wildFusionState.ts`,
`WorldScene.buildWildFusions`) - each rendered as its own map sprite,
holding a stable Fusion instance rather than rolling fresh per encounter.
Defeating or catching one removes it from the map and starts the flat,
global 2-minute respawn timer described above, after which the exact same
Fusion reappears. Named bosses still aren't implemented - the mechanism
above is designed to extend to them (a longer, per-boss respawn timer and
guaranteed loot), but no boss content or loot tables exist yet.

## Breeding & Genetics

This is the game's signature system. Two compatible Fusions (same breeding
group, opposite or compatible breeding roles) produce an offspring egg. The
offspring's genome is built gene-by-gene from its parents, using a real
dominant/recessive inheritance model:

- Every heritable trait is controlled by a **gene**, and every gene has two
  **alleles** — one inherited from each parent, exactly like a Punnett
  square. Offspring express the dominant allele; a recessive allele can be
  silently carried for generations and resurface later if two carriers are
  bred together.
- Genes are organized into categories:
  - **Type genes** — determine the offspring's elemental type(s). Some
    type combinations only appear when both parents carry a matching
    recessive type allele.
  - **Stat genes (polygenic)** — each core stat is influenced by *several*
    genes, not one, so stats blend and vary across a range rather than
    being fixed — selective breeding across generations can push a
    bloodline's stats up over time, like real quantitative genetics.
  - **Trait genes** — single dominant/recessive gene pairs controlling
    passive abilities. Classic Mendelian inheritance: dominant masks
    recessive, but recessive traits can reappear from two carrier parents.
  - **Move/aptitude genes** — determine which moves an offspring is capable
    of learning. Some moves are recessive-locked "hidden moves" that only
    become available when an offspring inherits the recessive allele from
    both parents.
  - **Cosmetic genes** — color, pattern, and size variations with no
    combat effect, inherited the same way. Rare recessive combinations
    produce visually distinct Fusions worth collecting/showing off.
- **Mutation** — each gene has a small independent chance to flip to a
  novel allele during breeding, occasionally introducing a trait, move, or
  cosmetic variant that neither parent had. This is the same underlying
  mechanism as the Unraveling, just controlled and rare in normal breeding
  — a deliberate narrative parallel between what the player does responsibly
  in a breeding lab and what's happening uncontrolled in the wild.

The practical effect: no two bred Fusions are identical, breeding for a
specific combination of type/stats/moves/traits is a real optimization
problem, and there's a long tail of rare recessive/mutated combinations to
chase — the game's answer to shiny hunting or perfect-IV breeding.

## Procedural Graphics & Data Catalogs (implemented)

Unlike hand-drawn sprites per species, every Fusion's appearance is
assembled at runtime from a fixed library of interchangeable body parts —
this is also how the "graphics gene" is inherited. This part of the design
is implemented in code, not just described here; see `src/`.

- **`src/data/parts.ts`** — the part catalog: 8 heads, 8 bodies, 8 legs, and
  8 wing variants (one of which is "no wings"), each a small retro
  pixel-art sprite plus a dominance rank, a rarity weight, and small stat
  modifiers. A Fusion's visible body is one head + one body + one legs +
  one wings, each independently inherited. The parts are procedurally
  generated (SVG under the hood, each "pixel" a small `<rect>`) rather
  than hand-drawn, since they need to stay independently swappable for
  breeding - but not blocky guesswork: `src/render/pixelArt.ts` builds
  each part's silhouette from a few overlapping ellipses
  (`unionEllipses`), then derives a full outline + highlight/shadow ramp
  automatically from that shape's own geometry (`shadeSilhouette`) -
  perimeter pixels become the outline, upper-left shades light, lower-
  right shades dark - so every part gets smooth, consistently-lit shading
  without hand-tuning each one. `applyOverrides` adds eyes/claws/facet
  accents on top, and `buildPalette` keeps a fixed near-black outline
  with a base/shadow/highlight ramp per part's own color.
- **`src/data/types.ts`** — the 9 breedable elemental types plus **void**,
  a mutation-only type representing the Unraveling's corruption (it can
  never be inherited normally, only introduced by mutation). Includes the
  type-effectiveness chart and each type's dominance rank.
- **`src/data/moves.ts`** — 3 moves per type (2 ordinary dominant moves, 1
  recessive "hidden move" that only surfaces if both move-locus alleles
  carry it).
- **`src/data/traits.ts`** — 6 passive-trait gene loci, each a dominant/
  recessive pair (12 traits total). One recessive trait, `unstable_genome`,
  mechanically raises its offspring's mutation rate — a deliberate echo of
  the Unraveling.
- **`src/genetics/genome.ts` / `breeding.ts`** — the actual inheritance
  engine. `createFounderGenome` builds a homozygous wild-caught Fusion
  (no hidden recessives of its own); `breed(parentA, parentB, rng)` performs
  per-locus meiosis (each parent contributes one of its two alleles per
  gene, exactly like a Punnett square), expresses dominance for
  type/part/trait/move genes, sums polygenic alleles for stats, and then
  applies a small independent mutation chance per locus — occasionally
  swapping in a value neither parent had, which is what makes bred Fusions'
  part combinations genuinely novel rather than just a shuffle of the two
  parents'. A much rarer secondary roll can corrupt a type allele into
  `void`.
- **`src/genetics/registry.ts`** — the `ConcordRegistry` class: the
  in-game Concord registry described above. It fingerprints a Fusion's
  *discrete* traits (type, parts, traits, moves — not continuous stats or
  cosmetic hue) and tracks how many times that exact combination has been
  seen. Because the combination space is enormous, seeing the same
  signature twice is rare but not prevented, by design.
- **`src/render/compositeSprite.ts`** — layers the phenotype's four parts
  onto shared anchor points into one SVG, and applies a small per-individual
  hue/scale jitter (seeded from the genome's own `visualSeed`, so the same
  individual always renders the same way) on top of the inherited part
  choice. This is the "little random factor in addition to inheritance."
- **`src/scenes/CatalogPreviewScene.ts`** — a debug Phaser scene that breeds
  two random wild Fusions together and renders both parents and the
  offspring on screen, to prove the whole pipeline (catalog → genome →
  breeding → phenotype → composited texture) works end to end. It's
  registered in `main.ts`'s `scene: [...]` list but never auto-started;
  load the game with `?debug=catalog-preview` in the URL to jump straight
  to it instead of the normal character-creation/world boot flow.

`npm test` runs the breeding-engine unit tests (dominance expression,
mutation bounds, dual-typing carrier behavior, registry de-duplication).

## Progression

- **Party roster** — up to 6 Fusions (`src/state/party.ts`), a data layer
  (add/remove/reorder/active-slot operations) filled by capture, starter
  selection, and breeding, with in-battle switching now live (see
  "Battling" above) - still no dedicated roster-browsing/reorder screen,
  only the pause menu's REGISTRY/STORAGE screens browse discovered
  signatures/stored overflow respectively.
- **Fusion storage** — an uncapped overflow box (`src/state/storage.ts`,
  `src/scenes/StorageScene.ts`, opened via the pause menu's STORAGE entry)
  for Fusions beyond the 6-slot roster - browse and withdraw are
  implemented; there's no "deposit from roster" flow yet.
- **Breeding UI** — the pause menu's BREED entry (`src/scenes/BreedingScene.ts`)
  picks two parents from the roster/storage pool and produces a new,
  already-bred Fusion via the real genetics engine (see "Breeding &
  Genetics" above), added to the roster or storage. It skips the
  egg/hatching step described above - the offspring is born immediately,
  not laid as an egg that hatches later (that's still a separate,
  not-yet-built TODO item) - and doesn't gate on breeding-group
  compatibility.
- **Save/load** — SAVE in the pause menu (`src/state/save.ts`) serializes
  the player's position/appearance/name, roster, storage, active-slot
  index, inventory, and the Concord registry into one blob in
  `localStorage`; the title screen's CONTINUE option loads it back and
  drops the player back into the world at the saved spot, skipping
  character creation and starter selection. Story flags aren't part of
  the save yet since no story-flag system exists (see "Bastions"/"Story
  arc" below).
- **Bastions** — regional Concord research stations, each with a signature
  Fusion specialist to defeat, functioning as this game's gym/badge
  equivalent and gating story progress.
- **The Concord registry** — a full Fusion-dex-style log of every species
  and notable lineage/mutation you've discovered or bred.
- **Story arc** — Bastion progression is intercut with escalating Chimera
  Nine encounters, culminating in confronting the source of the Unraveling.

## Tech Stack

- **TypeScript** as the primary language.
- **Phaser 3** as the game framework (2D rendering, scene management, tile
  maps, sprite/animation handling, input).
- **Vite** as the dev server/bundler.

No specific hosting/backend decisions have been made yet (e.g. whether save
data is local-only or server-backed); treat the game as client-side/local
storage first, and revisit if multiplayer/trading features are added later.

## Playing it online (implemented)

The game auto-deploys to GitHub Pages:
**https://askapimax.github.io/Fusionmonsters/**

- `.github/workflows/deploy-pages.yml` runs on every push to
  `claude/monster-game-init-ab1uvs` (this repo's default branch): it
  installs dependencies, runs `npm run typecheck` and `npm test`, builds
  with `npm run build`, then publishes `dist/` to the `gh-pages` branch
  via `peaceiris/actions-gh-pages`.
- `vite.config.ts` sets `base: '/Fusionmonsters/'` for production builds
  only (dev keeps `base: '/'`, so `npm run dev` is unaffected) - without
  it, asset URLs would resolve against the domain root instead of the
  Pages subpath and everything would 404.
- One manual, one-time step this repo's own settings have to do (no
  tool here can flip it): in **Settings → Pages**, set
  **Build and deployment → Source** to **Deploy from a branch**, branch
  **gh-pages**, folder **/ (root)**. The `gh-pages` branch itself doesn't
  exist until the workflow's first run creates it, so this dropdown has
  nothing to point at before that.
- Verified locally before relying on CI: built with the real `base`,
  served the `dist/` output from a plain static file server nested under
  a `/Fusionmonsters/` path (not `vite preview`, which has its own
  unrelated dev-server quirks under a non-root base) to match how GitHub
  Pages actually serves it, and confirmed the game boots and is playable
  there via a headless browser.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
