/**
 * In-battle switching support (TODO.md "Battling" - In-battle switching).
 *
 * This is just the pure "which roster slots can I switch to right now?"
 * logic, kept separate from `BattleScene`'s Phaser/UI code so it's directly
 * unit-testable without a Scene, RNG, or `src/state/party.ts`'s
 * module-level singleton state.
 *
 * Why the caller needs its own `faintedThisBattle` bookkeeping on top of
 * `src/state/party.ts`'s own `RosterSlot.currentHp`: the roster only
 * persists a slot's HP when something explicitly writes it back (a win, a
 * loss, or - once this feature lands - a switch-away), never continuously.
 * While a roster slot is the *currently active* battle combatant, its
 * `currentHp` in the roster can be stale (still whatever it was when the
 * battle started, or last written back) right up until a switch or the
 * battle's end writes the real value back. `activeIndex` alone is enough to
 * keep that staleness from mattering for the active slot itself (it's
 * always excluded), but `faintedThisBattle` lets a caller also exclude a
 * slot it already knows fainted this battle even before that write-back
 * happens, as a deliberate belt-and-suspenders measure - see
 * `BattleScene.handlePlayerFaint`/`performSwitch`.
 */

/** The minimal shape `viableSwitchIndices` needs from a roster slot - just
 * `RosterSlot`'s `currentHp` field, kept structural so this module doesn't
 * need to import `src/state/party.ts` at all. */
export interface RosterSlotLike {
  currentHp: number;
}

/**
 * Returns the roster indices (in roster order) that are valid switch
 * targets right now: not the currently-active slot, not already recorded
 * as fainted this battle, and not at 0 HP per the roster's own persisted
 * `currentHp`.
 *
 * With a single-member roster this always returns `[]` (there is nothing
 * else to switch to), which is what lets `BattleScene` fall straight
 * through to its existing loss handling unchanged for that case.
 */
export function viableSwitchIndices(
  roster: ReadonlyArray<RosterSlotLike>,
  activeIndex: number | null,
  faintedThisBattle: ReadonlySet<number>,
): number[] {
  const indices: number[] = [];
  roster.forEach((slot, index) => {
    if (index === activeIndex) return;
    if (faintedThisBattle.has(index)) return;
    if (slot.currentHp <= 0) return;
    indices.push(index);
  });
  return indices;
}
