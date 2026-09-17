import { createFounderGenome, type FounderOptions } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import { mulberry32 } from '../genetics/rng';

/**
 * Trainer-battle data model (TODO.md "Battling" - Trainer-battle type). A
 * `TrainerDef` is a named NPC with a party of one or more Fusions, used to
 * launch `BattleScene` in "trainer mode" (see BattleScene.ts) instead of a
 * wild encounter: no RUN AWAY, trainer-flavored intro/outcome messages.
 *
 * There's no real NPC-interaction system yet (that's a separate, not-yet-
 * built TODO item), so trainers here are placed in the world via a simple
 * standalone trigger - see `STARTING_ZONE_TRAINERS` in
 * `src/world/startingZone.ts` and `WorldScene.maybeTriggerTrainerBattle`.
 *
 * Battling itself only ever uses `party[0]` for now (see BattleScene) -
 * multi-Fusion trainer parties with switching are explicitly out of scope
 * for this pass and remain a future TODO item.
 *
 * Each trainer's party is generated once, at module load, from a fixed
 * numeric seed via `mulberry32` rather than `randomSeed()` - deterministic
 * on every load, like a hand-placed/designed encounter should be, rather
 * than re-rolling randomly each time the game boots (the way wild
 * encounters intentionally do).
 */
export interface TrainerDef {
  id: string;
  name: string;
  /** Party of one or more Fusions, in battle order. Non-empty by construction. */
  party: Fusion[];
}

/** Builds a trainer's party deterministically from a fixed seed. */
export function buildTrainerParty(seed: number, count: number, options: FounderOptions = {}): Fusion[] {
  const rng = mulberry32(seed);
  return Array.from({ length: Math.max(1, count) }, () => createFusion(createFounderGenome(rng, options)));
}

const TRAINER_LIST: TrainerDef[] = [
  {
    id: 'fernbrook_scout',
    name: 'Scout Reyna',
    // Fixed seed -> the same Fusion every time the game loads, like a
    // designed/hand-placed encounter rather than a random wild spawn.
    party: buildTrainerParty(0x5c0117a3, 1, { forcedPrimaryType: 'aero' }),
  },
];

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(
  TRAINER_LIST.map((trainer) => [trainer.id, trainer]),
);

export type TrainerId = (typeof TRAINER_LIST)[number]['id'];
