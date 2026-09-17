import { describe, expect, it } from 'vitest';
import { viableSwitchIndices, type RosterSlotLike } from './partySwitching';

function slot(currentHp: number): RosterSlotLike {
  return { currentHp };
}

describe('viableSwitchIndices', () => {
  it('returns nothing for a single-member roster (matches the pre-switching loss behavior)', () => {
    const roster = [slot(20)];
    expect(viableSwitchIndices(roster, 0, new Set())).toEqual([]);
  });

  it('excludes the currently-active slot even though it is otherwise healthy', () => {
    const roster = [slot(20), slot(15)];
    expect(viableSwitchIndices(roster, 0, new Set())).toEqual([1]);
  });

  it('excludes slots at 0 HP', () => {
    const roster = [slot(20), slot(0), slot(10)];
    expect(viableSwitchIndices(roster, 0, new Set())).toEqual([2]);
  });

  it('excludes slots recorded as fainted this battle even if their stored HP is stale/nonzero', () => {
    // e.g. the active slot's own roster entry hasn't been written back yet
    // right after it faints - the caller marks it fainted itself.
    const roster = [slot(20), slot(15), slot(12)];
    expect(viableSwitchIndices(roster, 0, new Set([1]))).toEqual([2]);
  });

  it('returns every other non-fainted slot when several are viable', () => {
    const roster = [slot(20), slot(15), slot(12), slot(0)];
    expect(viableSwitchIndices(roster, 2, new Set())).toEqual([0, 1]);
  });

  it('returns [] when every other slot is fainted or dead', () => {
    const roster = [slot(20), slot(0), slot(5)];
    expect(viableSwitchIndices(roster, 0, new Set([2]))).toEqual([]);
  });

  it('treats a null activeIndex as "nothing is active" (excludes nothing by index)', () => {
    const roster = [slot(10), slot(5)];
    expect(viableSwitchIndices(roster, null, new Set())).toEqual([0, 1]);
  });

  it('handles an empty roster', () => {
    expect(viableSwitchIndices([], null, new Set())).toEqual([]);
  });
});
