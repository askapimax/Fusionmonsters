import { createFounderGenome } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import { mulberry32 } from '../genetics/rng';
import { concordRegistry } from './registry';

/**
 * The Fusion storage ("box") system (TODO.md "Breeding UI & Progression" -
 * Fusion storage): overflow space for Fusions beyond the 6-slot active
 * roster (`src/state/party.ts`, `MAX_ROSTER_SIZE`). Mirrors `party.ts`'s
 * module-level-singleton style (a plain array + free functions, not a
 * class), but deliberately simpler in two ways the TODO item itself calls
 * out:
 *
 * - **No capacity cap.** The roster is the "limited, has-to-be-managed"
 *   list; storage is explicitly the unlimited overflow space caught/bred
 *   Fusions exceeding roster capacity land in, so `depositToStorage` never
 *   fails the way `addToRoster` can.
 * - **No "active slot"/live HP concept.** Roster members persist
 *   `currentHp` because they can be mid-battle; stored Fusions never are.
 *   Design choice made here: a stored Fusion keeps whatever HP state it
 *   *had* at deposit time frozen on its `Fusion` object (nothing here
 *   mutates it), and withdrawing one back into the roster hands it to
 *   `addToRoster`, which - like every other roster addition - resets it to
 *   full HP. In other words: full HP on withdrawal is `party.ts`'s existing
 *   behavior, not something storage itself has to implement or track.
 *
 * There's no caller wiring deposits in yet (no capture/breeding/hatching
 * UI exists - see TODO.md), so `depositToStorage` currently has no
 * production caller beyond this module's own demo seeding below. Whoever
 * builds capture/breeding/hatching-overflow should call it directly, e.g.
 * "if `addToRoster` returns false, `depositToStorage` instead."
 */

const storage: Fusion[] = [];

/**
 * Deposits a Fusion into storage. Always succeeds (no capacity cap - see
 * module doc comment). Registers the Fusion into `concordRegistry`
 * defensively: `ConcordRegistry.register` is safe to call on an
 * already-registered signature (it just increments `timesDiscovered`
 * instead of erroring or duplicating), and most Fusions reaching storage
 * will already be registered via the roster/wild-encounter/capture path
 * that put them in the player's hands in the first place - but registering
 * again here is simpler and safer than trying to track "was this already
 * registered" across every possible future caller.
 */
export function depositToStorage(fusion: Fusion): void {
  concordRegistry.register(fusion.genome, fusion.phenotype);
  storage.push(fusion);
}

/**
 * Removes and returns the stored Fusion at `index` (or `null` if `index`
 * is out of range), for a caller to hand off elsewhere - typically
 * `addToRoster` to move it into the active roster. Does not itself touch
 * the roster; that's the caller's job (see `StorageScene`'s withdraw flow).
 */
export function withdrawFromStorage(index: number): Fusion | null {
  if (index < 0 || index >= storage.length) {
    return null;
  }
  const [removed] = storage.splice(index, 1);
  return removed;
}

/**
 * Read-only view of stored Fusions in storage order, for `StorageScene`'s
 * browse grid. Mutate storage only through `depositToStorage`/
 * `withdrawFromStorage`.
 */
export function getStorage(): ReadonlyArray<Readonly<Fusion>> {
  return storage;
}

/**
 * Demo/test-seed content: a couple of Fusions deposited at module load so
 * `StorageScene` has something real to browse/withdraw out of the box
 * without needing a capture/breeding/hatching flow to exist first (none of
 * those are wired up yet - see the module doc comment above). Built from
 * fixed seeds via `mulberry32` rather than `randomSeed()`, matching
 * `src/data/trainers.ts`'s "designed/hand-placed, not re-rolled every
 * load" convention, so the demo content is stable across reloads instead
 * of different every time. Remove this (or replace it with real
 * deposit-on-roster-full/breeding/hatching callers) once one of those
 * exists - the empty-storage state renders correctly on its own too (see
 * `StorageScene`'s empty-state message), this is purely to make the
 * feature demonstrable today.
 */
function seedDemoStorage(): void {
  const seeds = [0x1b0c5a17, 0x7e4f2c91];
  for (const seed of seeds) {
    const fusion = createFusion(createFounderGenome(mulberry32(seed)));
    depositToStorage(fusion);
  }
}
seedDemoStorage();

/**
 * Test-only: resets storage to empty, so each test can start from a clean
 * slate instead of the module's demo-seeded content. Not used by any
 * gameplay code. Mirrors `party.ts`'s `__resetPartyForTests`.
 */
export function __resetStorageForTests(): void {
  storage.length = 0;
}
