/**
 * The player's character-creation choices: appearance (cosmetic only, per
 * README) and name. Set once by `CharacterCreationScene` before
 * `WorldScene` ever boots (see src/main.ts), but kept safe to import
 * earlier - and to read from with sensible defaults if that scene is ever
 * skipped - mirroring the module-level-singleton style of
 * `src/state/party.ts` / `src/state/inventory.ts`.
 */

export type PlayerAppearance = 'male' | 'female';

const DEFAULT_APPEARANCE: PlayerAppearance = 'male';
const DEFAULT_NAME = 'Splicer';

let playerAppearance: PlayerAppearance = DEFAULT_APPEARANCE;
let playerName: string = DEFAULT_NAME;

export function getPlayerAppearance(): PlayerAppearance {
  return playerAppearance;
}

export function setPlayerAppearance(appearance: PlayerAppearance): void {
  playerAppearance = appearance;
}

export function getPlayerName(): string {
  return playerName;
}

/** Trims the input and falls back to the default name if it's empty. */
export function setPlayerName(name: string): void {
  const trimmed = name.trim();
  playerName = trimmed.length > 0 ? trimmed : DEFAULT_NAME;
}
