/** Deterministic PRNG (mulberry32) so a stored seed always reproduces the same sequence. */
export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

export function pickRandom<T>(items: readonly T[], rng: RNG): T {
  return items[Math.floor(rng() * items.length)];
}

/** Weighted random pick, e.g. rarer catalog parts should surface less often. */
export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: RNG): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
