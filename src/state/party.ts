import { createFounderGenome } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import { mulberry32, randomSeed } from '../genetics/rng';

/**
 * The player's single battling Fusion. There's no starter-selection flow or
 * party management yet (see TODO.md), so rather than block battles on that
 * unbuilt UI, the player is auto-assigned one random founder Fusion the
 * first time it's needed and keeps it for the rest of the session -
 * the same "skip the unbuilt flow, unblock the mechanic" shortcut
 * WorldScene already took for character creation.
 *
 * `currentHp` persists across encounters (consecutive battles carry real
 * risk), but there is no healing yet either - see src/scenes/BattleScene.ts
 * for the full-heal-on-faint safety net that stands in for it.
 */
let playerFusion: Fusion | null = null;
export let playerCurrentHp: number | null = null;

export function getPlayerFusion(): Fusion {
  if (!playerFusion) {
    playerFusion = createFusion(createFounderGenome(mulberry32(randomSeed())));
    playerCurrentHp = playerFusion.phenotype.stats.hp;
  }
  return playerFusion;
}

export function getPlayerCurrentHp(): number {
  getPlayerFusion();
  return playerCurrentHp!;
}

export function setPlayerCurrentHp(hp: number): void {
  const fusion = getPlayerFusion();
  playerCurrentHp = Math.max(0, Math.min(fusion.phenotype.stats.hp, hp));
}

export function healPlayerFully(): void {
  const fusion = getPlayerFusion();
  playerCurrentHp = fusion.phenotype.stats.hp;
}
