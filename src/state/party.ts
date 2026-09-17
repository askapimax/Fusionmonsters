import { createFounderGenome } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import type { Genome } from '../genetics/genome';
import { mulberry32, randomSeed } from '../genetics/rng';
import { concordRegistry } from './registry';

/**
 * The player's party roster: up to `MAX_ROSTER_SIZE` battling Fusions, one
 * of which is "active" (the one `BattleScene`/`WorldScene` actually battle
 * with today, ahead of the in-battle-switching TODO item that will let the
 * player pick among more than one).
 *
 * Shape: `roster` is an ordered array of slots, each pairing a `Fusion`
 * with its own persisted `currentHp` (HP persists across encounters the
 * same way it always has - consecutive battles carry real risk). Order in
 * the array is the display/roster order that `reorderRoster` rearranges;
 * there's no separate "slot id", the array index *is* the slot.
 *
 * `activeSlot` tracks the active member by object reference rather than by
 * index, so it automatically keeps pointing at the right Fusion across a
 * `reorderRoster` call without any index bookkeeping - only
 * `removeFromRoster` and `setActiveSlot` ever need to reassign it.
 *
 * There's no starter-selection flow yet (see TODO.md), so rather than
 * block battles on that unbuilt UI, the roster keeps the same shortcut it
 * always has: if nothing has been added yet, the first call to any of
 * `getPlayerFusion`/`getPlayerCurrentHp`/`setPlayerCurrentHp`/
 * `healPlayerFully` auto-assigns one random founder Fusion into slot 0 and
 * makes it active. Once starter selection, capture, and hatching exist,
 * they should call `addToRoster` directly instead and this lazy path will
 * simply never trigger (a non-empty roster short-circuits it).
 *
 * `getPlayerFusion()` etc. are kept as the stable "currently-active roster
 * slot" API that `BattleScene.ts`/`WorldScene.ts` already depend on - see
 * TODO.md's "Party roster data layer" item for why this shouldn't change
 * shape out from under them.
 */
export interface RosterSlot {
  fusion: Fusion;
  currentHp: number;
}

export const MAX_ROSTER_SIZE = 6;

const roster: RosterSlot[] = [];

/** The roster slot the player is currently battling with, or `null` if the roster is empty. */
let activeSlot: RosterSlot | null = null;

/** Creates a fresh random founder Fusion and registers it, matching the original lazy-init path. */
function createRandomFounder(): Fusion {
  const fusion = createFusion(createFounderGenome(mulberry32(randomSeed())));
  concordRegistry.register(fusion.genome, fusion.phenotype);
  return fusion;
}

/**
 * Ensures there is an active slot to operate on, auto-assigning a random
 * founder into an empty roster exactly like the pre-roster `party.ts` did.
 * This is the one place that lazy-init shortcut lives now.
 */
function ensureActiveSlot(): RosterSlot {
  if (roster.length === 0) {
    const slot: RosterSlot = { fusion: createRandomFounder(), currentHp: 0 };
    slot.currentHp = slot.fusion.phenotype.stats.hp;
    roster.push(slot);
    activeSlot = slot;
  } else if (!activeSlot) {
    // Roster is non-empty but nothing is marked active (e.g. every slot up
    // to and including the previously-active one was removed) - default to
    // the first slot, same "fall back to slot 0" behavior `removeFromRoster`
    // documents below.
    activeSlot = roster[0];
  }
  return activeSlot;
}

/**
 * Returns the player's currently-active battling Fusion, auto-assigning a
 * random founder into an empty roster the first time this (or any of the
 * other three functions below) is called. Unchanged behavior from before
 * the roster existed - see the module doc comment above.
 */
export function getPlayerFusion(): Fusion {
  return ensureActiveSlot().fusion;
}

/** Returns the active slot's current HP, auto-assigning a roster member first if needed. */
export function getPlayerCurrentHp(): number {
  return ensureActiveSlot().currentHp;
}

/** Sets the active slot's current HP, clamped to [0, that Fusion's max HP]. */
export function setPlayerCurrentHp(hp: number): void {
  const slot = ensureActiveSlot();
  slot.currentHp = Math.max(0, Math.min(slot.fusion.phenotype.stats.hp, hp));
}

/** Fully heals the active slot's Fusion (sets currentHp to its max HP). */
export function healPlayerFully(): void {
  const slot = ensureActiveSlot();
  slot.currentHp = slot.fusion.phenotype.stats.hp;
}

/**
 * Adds a Fusion to the roster (as a new slot at full HP) if there's room,
 * and registers it into `concordRegistry` the same way the lazy-init path
 * does, so every Fusion the player ends up with - starter pick, capture,
 * hatch - gets registered. Returns whether it was added (`false` when the
 * roster is already at `MAX_ROSTER_SIZE`). If the roster was empty, the
 * newly-added Fusion becomes the active slot.
 */
export function addToRoster(fusion: Fusion): boolean {
  if (roster.length >= MAX_ROSTER_SIZE) {
    return false;
  }
  concordRegistry.register(fusion.genome, fusion.phenotype);
  const slot: RosterSlot = { fusion, currentHp: fusion.phenotype.stats.hp };
  roster.push(slot);
  if (!activeSlot) {
    activeSlot = slot;
  }
  return true;
}

/**
 * Removes/releases the roster slot at `index`, returning the released
 * Fusion (or `null` if `index` is out of range). If the removed slot was
 * the active one, the active slot falls back to the new slot 0, or to
 * "none" if the roster is now empty (the next call to `getPlayerFusion`
 * etc. will lazily auto-assign a fresh founder, same as a never-touched
 * roster).
 */
export function removeFromRoster(index: number): Fusion | null {
  if (index < 0 || index >= roster.length) {
    return null;
  }
  const [removed] = roster.splice(index, 1);
  if (activeSlot === removed) {
    activeSlot = roster.length > 0 ? roster[0] : null;
  }
  return removed.fusion;
}

/**
 * Moves the roster slot at `fromIndex` to `toIndex`, shifting the slots in
 * between (standard array-move semantics). Out-of-range indices are a
 * no-op. The active slot is tracked by object reference, so it stays
 * correctly "pointed at" the same Fusion across a reorder automatically.
 */
export function reorderRoster(fromIndex: number, toIndex: number): void {
  if (
    fromIndex < 0 ||
    fromIndex >= roster.length ||
    toIndex < 0 ||
    toIndex >= roster.length ||
    fromIndex === toIndex
  ) {
    return;
  }
  const [moved] = roster.splice(fromIndex, 1);
  roster.splice(toIndex, 0, moved);
}

/**
 * Read-only view of the roster in display order, for a future roster/
 * storage UI. Each entry is `{ fusion, currentHp }`; mutate the roster only
 * through `addToRoster`/`removeFromRoster`/`reorderRoster`/`setPlayerCurrentHp`.
 */
export function getRoster(): ReadonlyArray<Readonly<RosterSlot>> {
  return roster;
}

/**
 * Marks the roster slot at `index` as the active (currently battling)
 * Fusion. Out-of-range indices are a no-op. Not wired into any UI yet -
 * this is the data-layer support the future in-battle-switching TODO item
 * will call into.
 */
export function setActiveSlot(index: number): void {
  if (index < 0 || index >= roster.length) {
    return;
  }
  activeSlot = roster[index];
}

/**
 * Index of the currently-active roster slot, or `null` if the roster is
 * empty (nothing active yet). Useful for a future UI to highlight the
 * active member.
 */
export function getActiveSlotIndex(): number | null {
  if (!activeSlot) {
    return null;
  }
  const index = roster.indexOf(activeSlot);
  return index === -1 ? null : index;
}

/**
 * Save/load (see `src/state/save.ts`): replaces the roster wholesale with
 * previously-saved slots, re-deriving each `Fusion` from its saved `genome`
 * via `createFusion` (deterministic from `genome.visualSeed` - see
 * `genetics/fusion.ts`) rather than persisting the whole `Fusion` object.
 * Deliberately does **not** touch `concordRegistry` - the save/load module
 * restores the registry from its own saved snapshot separately, and
 * re-registering every roster member here would incorrectly bump
 * `timesDiscovered` a second time for each of them.
 */
export function restoreRoster(
  slots: ReadonlyArray<{ genome: Genome; currentHp: number }>,
  activeIndex: number | null,
): void {
  roster.length = 0;
  for (const slot of slots) {
    roster.push({ fusion: createFusion(slot.genome), currentHp: slot.currentHp });
  }
  activeSlot = activeIndex !== null && activeIndex >= 0 && activeIndex < roster.length ? roster[activeIndex] : null;
}

/**
 * Test-only: resets the roster to empty with no active slot, so each test
 * can start from the same lazy-init-pending state the app does on boot.
 * Not used by any gameplay code.
 */
export function __resetPartyForTests(): void {
  roster.length = 0;
  activeSlot = null;
}
