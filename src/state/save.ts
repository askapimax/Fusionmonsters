import type { ZoneId } from '../data/spawnTables';
import type { Genome } from '../genetics/genome';
import type { RegistryEntry } from '../genetics/registry';
import type { ZoneSpawn } from '../world/zoneTypes';
import { type InventoryEntry, playerInventory } from './inventory';
import { getActiveSlotIndex, getRoster, restoreRoster } from './party';
import { getPlayerAppearance, getPlayerName, setPlayerAppearance, setPlayerName, type PlayerAppearance } from './player';
import { concordRegistry } from './registry';
import { getStorage, restoreStorage } from './storage';
import { getWorldPosition } from './worldPosition';

/**
 * Save/load via `localStorage` (TODO.md "Persistence & Platform"). One JSON
 * blob under `SAVE_KEY` holds everything needed to resume: the player's
 * appearance/name (`src/state/player.ts`), current zone/tile position
 * (`src/state/worldPosition.ts`, published by `WorldScene`), roster +
 * storage (`src/state/party.ts` / `storage.ts` - genomes only, see
 * `SavedFusion` below), inventory (`src/state/inventory.ts`), and the
 * Concord registry (`src/genetics/registry.ts`).
 *
 * `version` is bumped whenever the blob's shape changes; there's exactly one
 * shape so far (`1`), so there's no migration logic yet beyond
 * `loadSaveBlob` refusing anything that doesn't look like a version-1 blob -
 * add real migration (e.g. a `migrate(oldBlob)` step per version bump) once
 * a second version actually exists, rather than speculatively now.
 *
 * `storyFlags` is a placeholder empty object: no story-flag system exists
 * anywhere in the codebase yet (see TODO.md), so there's nothing real to
 * serialize - this field exists purely so a future story-flag system can
 * start writing into an already-reserved save-blob field instead of needing
 * another version bump just to add the key.
 */

export const SAVE_KEY = 'fusionmonsters-save';
export const SAVE_VERSION = 1;

/**
 * A roster/storage member as saved: only the `genome` (plus `currentHp` for
 * roster slots, which storage members don't have) rather than the whole
 * `Fusion` object - `createFusion(genome)` (`src/genetics/fusion.ts`)
 * re-derives `phenotype` deterministically from `genome.visualSeed`, so
 * persisting it too would just be redundant, re-derivable data.
 */
export interface SavedRosterSlot {
  genome: Genome;
  currentHp: number;
}

export interface SaveBlob {
  version: typeof SAVE_VERSION;
  /** `Date.now()` at save time - not read by any restore logic today, kept for future debugging/display. */
  savedAt: number;
  player: {
    appearance: PlayerAppearance;
    name: string;
  };
  /**
   * `null` only in the defensive edge case where a save was somehow taken
   * before `WorldScene` ever ran once this session (SAVE is normally only
   * reachable from the pause menu, which is only reachable from inside
   * `WorldScene` - see `src/state/worldPosition.ts`). Loading a save with a
   * `null` position falls back to `WorldScene`'s own default spawn.
   */
  position: { zoneId: ZoneId; spawn: ZoneSpawn } | null;
  roster: SavedRosterSlot[];
  activeSlotIndex: number | null;
  storage: Genome[];
  inventory: InventoryEntry[];
  registry: RegistryEntry[];
  /** Placeholder for a future story-flag system - see module doc comment. Intentionally always `{}` today. */
  storyFlags: Record<string, never>;
}

/** Gathers all current game state into one plain-object save blob (does not write anywhere - see `saveGame`). */
export function serializeSaveBlob(): SaveBlob {
  const worldPosition = getWorldPosition();
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    player: {
      appearance: getPlayerAppearance(),
      name: getPlayerName(),
    },
    position: worldPosition
      ? { zoneId: worldPosition.zoneId, spawn: { col: worldPosition.col, row: worldPosition.row } }
      : null,
    roster: getRoster().map((slot) => ({ genome: slot.fusion.genome, currentHp: slot.currentHp })),
    activeSlotIndex: getActiveSlotIndex(),
    storage: getStorage().map((fusion) => fusion.genome),
    inventory: playerInventory.map((entry) => ({ ...entry })),
    registry: concordRegistry.list().map((entry) => ({ ...entry })),
    storyFlags: {},
  };
}

/**
 * Serializes current state and writes it to `localStorage`. Returns whether
 * it succeeded - `localStorage` can throw (private-browsing quota, disabled
 * storage, etc.), and a failed save shouldn't crash the game, just fail to
 * persist (see `PauseMenuScene.showSaveNotice`, this function's only caller).
 */
export function saveGame(): boolean {
  try {
    const blob = serializeSaveBlob();
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
    return true;
  } catch {
    return false;
  }
}

/** Minimal structural check - not a full schema validator, just enough to reject obviously-corrupt/foreign JSON before trusting it. */
function isValidSaveBlob(value: unknown): value is SaveBlob {
  if (!value || typeof value !== 'object') return false;
  const blob = value as Partial<SaveBlob>;
  return (
    blob.version === SAVE_VERSION &&
    typeof blob.player === 'object' &&
    blob.player !== null &&
    (blob.player.appearance === 'male' || blob.player.appearance === 'female') &&
    typeof blob.player.name === 'string' &&
    Array.isArray(blob.roster) &&
    Array.isArray(blob.storage) &&
    Array.isArray(blob.inventory) &&
    Array.isArray(blob.registry)
  );
}

/**
 * Reads and parses the save blob from `localStorage`, or `null` if there is
 * none, or if what's there is missing/corrupted/unparsable/not shaped like a
 * version-`SAVE_VERSION` blob - callers never need their own try/catch
 * around this.
 */
export function loadSaveBlob(): SaveBlob | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSaveBlob(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Whether a valid save exists - drives `TitleScreenScene`'s CONTINUE `enabled` flag. */
export function hasSaveData(): boolean {
  return loadSaveBlob() !== null;
}

/**
 * Writes a previously-loaded save blob's data back into every relevant state
 * module (player/roster/storage/inventory/registry). Does **not** touch
 * `WorldScene`/start any scene - the caller (`TitleScreenScene.continueGame`)
 * is responsible for starting `WorldScene` at `blob.position` afterward.
 */
export function restoreFromSaveBlob(blob: SaveBlob): void {
  setPlayerAppearance(blob.player.appearance);
  setPlayerName(blob.player.name);

  restoreRoster(blob.roster, blob.activeSlotIndex);
  restoreStorage(blob.storage);

  playerInventory.length = 0;
  playerInventory.push(...blob.inventory.map((entry) => ({ ...entry })));

  concordRegistry.restore(blob.registry);
}
