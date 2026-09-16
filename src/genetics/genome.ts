import { PARTS_BY_ID, type PartCategory } from '../data/parts';
import { BASE_STAT_VALUE, STAT_KEYS, type StatKey } from '../data/stats';
import type { TypeId } from '../data/types';
import type { RNG } from './rng';

export type AlleleOrigin = 'founder' | 'inherited' | 'mutation';

export interface Allele<T> {
  value: T;
  dominanceRank: number;
  origin: AlleleOrigin;
}

export interface Locus<T> {
  alleleA: Allele<T>;
  alleleB: Allele<T>;
}

/** How many independent loci contribute to each stat's polygenic total. */
export const STAT_LOCI_PER_STAT = 3;

/** How many move-gene loci a genome carries (offspring can express up to this many distinct moves). */
export const MOVE_LOCI_COUNT = 4;

export const NONE_SECONDARY_TYPE = 'none' as const;
export type SecondaryTypeValue = TypeId | typeof NONE_SECONDARY_TYPE;

export interface Genome {
  id: string;
  generation: number;
  parentIds: [string, string] | null;
  /** Seeds cosmetic jitter and phenotype-expression tie-breaks; unique per individual, not inherited. */
  visualSeed: number;
  primaryTypeLocus: Locus<TypeId>;
  secondaryTypeLocus: Locus<SecondaryTypeValue>;
  partLoci: Record<PartCategory, Locus<string>>;
  statLoci: Record<StatKey, Locus<number>[]>;
  traitLoci: Locus<string>[];
  moveLoci: Locus<string>[];
  /** Hue in degrees (0-359), inherited and blended rather than dominance-expressed. */
  colorLocus: Locus<number>;
}

export interface Phenotype {
  primaryType: TypeId;
  secondaryType: TypeId | null;
  parts: Record<PartCategory, string>;
  stats: Record<StatKey, number>;
  traits: string[];
  moves: string[];
  hue: number;
}

export function expressLocus<T>(locus: Locus<T>, rng: RNG): T {
  const { alleleA, alleleB } = locus;
  if (alleleA.dominanceRank === alleleB.dominanceRank) {
    return rng() < 0.5 ? alleleA.value : alleleB.value;
  }
  return alleleA.dominanceRank > alleleB.dominanceRank ? alleleA.value : alleleB.value;
}

function expressStat(loci: Locus<number>[]): number {
  return loci.reduce((sum, locus) => sum + locus.alleleA.value + locus.alleleB.value, BASE_STAT_VALUE);
}

export function generateGenomeId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function expressPhenotype(genome: Genome, rng: RNG): Phenotype {
  const primaryType = expressLocus(genome.primaryTypeLocus, rng);
  const secondary = expressLocus(genome.secondaryTypeLocus, rng);

  const parts = Object.fromEntries(
    (Object.keys(genome.partLoci) as PartCategory[]).map((category) => [
      category,
      expressLocus(genome.partLoci[category], rng),
    ]),
  ) as Record<PartCategory, string>;

  const stats = Object.fromEntries(
    STAT_KEYS.map((stat) => [stat, expressStat(genome.statLoci[stat])]),
  ) as Record<StatKey, number>;

  for (const category of Object.keys(parts) as PartCategory[]) {
    const part = PARTS_BY_ID[parts[category]];
    if (!part) continue;
    for (const [stat, modifier] of Object.entries(part.statModifiers) as [StatKey, number][]) {
      stats[stat] += modifier;
    }
  }

  const traits = Array.from(new Set(genome.traitLoci.map((locus) => expressLocus(locus, rng))));
  const moves = Array.from(new Set(genome.moveLoci.map((locus) => expressLocus(locus, rng))));
  const hue = ((genome.colorLocus.alleleA.value + genome.colorLocus.alleleB.value) / 2 + 360) % 360;

  return {
    primaryType,
    secondaryType: secondary === NONE_SECONDARY_TYPE ? null : secondary,
    parts,
    stats,
    traits,
    moves,
    hue,
  };
}
