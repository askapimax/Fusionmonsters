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
below), and there's now a first playable zone with a walking placeholder
character (see [The First Zone: Fernbrook Outpost](#the-first-zone-fernbrook-outpost-implemented)) -
but no character creation, battling, capturing, or breeding UI yet, and no
spawn/respawn implementation. See [TODO.md](TODO.md) for the current task
breakdown. Design decisions below are the accepted direction for the game
as of this writing, not aspirational/optional ideas.

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

Character creation itself (this screen) isn't built yet - see the next
section: `WorldScene` currently spawns a default-appearance placeholder
character directly into the world, so world/movement could be built and
tuned first.

## The First Zone: Fernbrook Outpost (implemented)

The game's actual starting point: a small Concord waystation at the edge of
the Reach, implemented as a real playable (if content-light) zone rather
than just described here - see `src/world/startingZone.ts` and
`src/scenes/WorldScene.ts`. This is what `npm run dev` currently boots into.

- A hand-laid 40x30 tile map: grass, a dirt path, a small pond, three tall-
  grass patches (future wild-encounter zones, not wired up yet), a
  signpost, and a small Concord field office (roof/wall/door tiles) the
  player starts right in front of, boxed in by a tree border with a gap at
  the south edge implying the road continues into content that doesn't
  exist yet.
- Tiles (`src/data/tiles.ts`) use the same pixel-art toolkit and pixel size
  as Fusion parts (`src/render/pixelArt.ts`), so the world and the
  creatures are visually one style, not two.
- A placeholder player character (`src/data/character.ts`): a single
  default appearance (no character-creation choices yet), with three
  generated sprites (front/back/side, side gets mirrored for left vs.
  right - the same trick Fusion parts use).
- Movement is classic tile-grid stepping (one tile per key-tap or per
  ~160ms while a direction is held), with per-tile collision (trees,
  water, and the building block movement; grass/path/tall grass don't),
  and the camera follows the player with bounds clamped to the map edge.

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

Turn-based combat, one Fusion active per side at a time (party of up to 6).
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

## Catching Fusions

Wild Fusions are encountered in the overworld. Weakening a wild Fusion in
battle and then using a capture item gives a chance to catch it, scaled by
remaining HP, status effects, and item strength — the familiar
weaken-then-throw-a-ball loop, renamed to fit the setting (capture devices
are Concord-issued "sample kits").

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
  pixel-art sprite (chunky flat-colored pixels with a dark outline, in the
  same style a Pokemon-like tile/sprite world would use) plus a dominance
  rank, a rarity weight, and small stat modifiers. A Fusion's visible body
  is one head + one body + one legs + one wings, each independently
  inherited. The parts are still SVG under the hood - each "pixel" is a
  small `<rect>` - authored via the toolkit in `src/render/pixelArt.ts`
  (`buildBlob`/`buildRows` for silhouettes, `applyOverrides` for
  eyes/decorations/shading, `buildPalette` for a consistent outline/base/
  shadow/highlight ramp per part), not hand-drawn pixel-by-pixel.
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
- **`src/scenes/CatalogPreviewScene.ts`** — a debug Phaser scene (not wired
  into `main.ts` right now, since `WorldScene` is the active boot scene -
  see "The First Zone" above) that breeds two random wild Fusions together
  and renders both parents and the offspring on screen, to prove the whole
  pipeline (catalog → genome → breeding → phenotype → composited texture)
  works end to end. Swap it into `main.ts`'s `scene: [...]` list to use it
  again.

`npm test` runs the breeding-engine unit tests (dominance expression,
mutation bounds, dual-typing carrier behavior, registry de-duplication).

## Progression

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

## License

Apache License 2.0 — see [LICENSE](LICENSE).
