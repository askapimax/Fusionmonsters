import { generateWildFusion } from '../data/wildEncounters';
import type { SpawnTable } from '../data/spawnTables';
import type { Fusion } from '../genetics/fusion';
import { mulberry32, randomSeed } from '../genetics/rng';

/**
 * Persistent wild-Fusion world entities + their global 2-minute respawn
 * timer (TODO.md "Spawns & Encounters"; README "Spawns & Named Bosses" -
 * "every regular mob respawns exactly 2 minutes after being caught or
 * defeated... flat, no per-species/zone tuning").
 *
 * This is deliberately a **module-level** store (plain `Map`s at import
 * scope), not scene-instance state, and it tracks each placement's cooldown
 * as a **wall-clock timestamp** (`Date.now()`), not a running countdown.
 * That's the more-correct design the task called out as worth doing if
 * there's time for it: `WorldScene`'s `scene.restart()` (the zone-transition
 * mechanism) tears down and rebuilds the scene instance, which would lose
 * any pending `this.time.delayedCall`/`addEvent` tied to `this` - a
 * scene-only timer would silently "forget" a respawn if the player left
 * Fernbrook and came back before the 2 minutes were up (it'd either respawn
 * immediately or never, depending on exactly what got torn down). Storing
 * `defeatedAt` here instead means "is this alive yet" can be recomputed
 * correctly from `Date.now()` any time a zone loads, however many scene
 * restarts happened in between. `WorldScene` still uses a real Phaser timer
 * (`this.time.delayedCall`) on top of this to flip the sprite back on
 * *while the player is standing in the zone* watching it happen - see
 * `WorldScene.buildWildFusions`/`scheduleWildFusionRespawn` - but that timer
 * is scheduled from the remaining wall-clock delay this module reports, not
 * a fresh 2 minutes, so re-entering the zone mid-cooldown still respawns at
 * the right moment instead of resetting the clock.
 *
 * Design choice on **what** reappears: each placement's `Fusion` is rolled
 * once, the first time it's needed, and then kept stable across every
 * respawn for the rest of the session - a defeated/caught wild Fusion
 * reappears as the *same* individual, not a fresh roll. This reads more
 * like "a specific world entity respawning" (what a hand-placed,
 * `id`-keyed placement implies) than "a recurring random encounter", which
 * the existing per-step tall-grass roll already covers. Re-rolling on every
 * respawn is a defensible alternative reading of "respawn" + "persistent
 * entity" together, but was not the one picked here.
 *
 * State here is in-memory only and resets on a full page reload - there's
 * no save/load system yet (see TODO.md "Persistence & Platform").
 */
export const WILD_RESPAWN_MS = 2 * 60 * 1000;

interface WildFusionState {
  fusion: Fusion;
  /** `null` while alive; the `Date.now()` moment it was defeated/caught otherwise. */
  defeatedAt: number | null;
}

const stateByPlacementId = new Map<string, WildFusionState>();

/** Gets (creating on first call) a placement's persistent state, rolling its
 * Fusion once via the normal wild-encounter generator (`generateWildFusion`,
 * biased by the zone's spawn table exactly like a random tall-grass
 * encounter would be). */
export function getWildFusionState(placementId: string, spawnTable?: SpawnTable): WildFusionState {
  let state = stateByPlacementId.get(placementId);
  if (!state) {
    state = { fusion: generateWildFusion(mulberry32(randomSeed()), spawnTable), defeatedAt: null };
    stateByPlacementId.set(placementId, state);
  }
  return state;
}

/** True if the placement is currently alive (never defeated, or its
 * cooldown has genuinely elapsed - flipping `defeatedAt` back to `null` as
 * a side effect in that case, so callers never need a separate "clear"
 * step). */
export function isWildFusionAlive(placementId: string, spawnTable?: SpawnTable): boolean {
  const state = getWildFusionState(placementId, spawnTable);
  if (state.defeatedAt === null) return true;
  if (Date.now() - state.defeatedAt >= WILD_RESPAWN_MS) {
    state.defeatedAt = null;
    return true;
  }
  return false;
}

/** Marks a placement defeated/caught right now, starting its 2-minute
 * respawn window. */
export function markWildFusionDefeated(placementId: string): void {
  const state = stateByPlacementId.get(placementId);
  if (state) state.defeatedAt = Date.now();
}

/** How many milliseconds remain until a currently-dead placement respawns
 * (0 if it's already alive or its cooldown has elapsed). Used to schedule
 * `WorldScene`'s Phaser respawn timer at the correct remaining delay rather
 * than a fresh `WILD_RESPAWN_MS`, so time that elapsed while the zone wasn't
 * loaded still counts. */
export function getWildFusionRespawnDelayMs(placementId: string): number {
  const state = stateByPlacementId.get(placementId);
  if (!state || state.defeatedAt === null) return 0;
  return Math.max(0, WILD_RESPAWN_MS - (Date.now() - state.defeatedAt));
}
