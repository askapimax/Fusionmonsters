export const STAT_KEYS = ['hp', 'attack', 'defense', 'focus', 'resist', 'speed'] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_NAMES: Record<StatKey, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  focus: 'Focus',
  resist: 'Resist',
  speed: 'Speed',
};

/** Every Fusion starts from this flat base before genome/part modifiers are added. */
export const BASE_STAT_VALUE = 10;
