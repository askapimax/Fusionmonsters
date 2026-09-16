import { PARTS_BY_CATEGORY, type PartCategory } from '../data/parts';
import { STAT_KEYS, type StatKey } from '../data/stats';
import { ALL_TRAIT_ALLELE_IDS, TRAIT_ALLELES_BY_ID, TRAIT_LOCI } from '../data/traits';
import { MOVES, movesForType } from '../data/moves';
import { BREEDABLE_TYPE_IDS, TYPES, type CycleTypeId, type TypeId } from '../data/types';
import {
  expressPhenotype,
  generateGenomeId,
  MOVE_LOCI_COUNT,
  NONE_SECONDARY_TYPE,
  STAT_LOCI_PER_STAT,
  type Allele,
  type AlleleOrigin,
  type Genome,
  type Locus,
  type SecondaryTypeValue,
} from './genome';
import { pickRandom, pickWeighted, type RNG } from './rng';

export const MUTATION_RATE = 0.04;
export const UNSTABLE_GENOME_MUTATION_MULTIPLIER = 1.5;
export const VOID_MUTATION_CHANCE = 0.004;

/** "No secondary type" outranks every real type, so a second type only ever
 * expresses when an offspring draws a real-type allele from *both* parents -
 * i.e. it can be silently carried by a single-typed parent and resurface later. */
const NONE_TYPE_DOMINANCE_RANK = 11;

const PART_CATEGORIES = Object.keys(PARTS_BY_CATEGORY) as PartCategory[];

function allele<T>(value: T, dominanceRank: number, origin: AlleleOrigin): Allele<T> {
  return { value, dominanceRank, origin };
}

function homozygousLocus<T>(value: T, dominanceRank: number, origin: AlleleOrigin): Locus<T> {
  return { alleleA: allele(value, dominanceRank, origin), alleleB: allele(value, dominanceRank, origin) };
}

function meiosisAllele<T>(parentLocus: Locus<T>, rng: RNG): Allele<T> {
  const chosen = rng() < 0.5 ? parentLocus.alleleA : parentLocus.alleleB;
  return allele(chosen.value, chosen.dominanceRank, 'inherited');
}

function inheritLocus<T>(parentALocus: Locus<T>, parentBLocus: Locus<T>, rng: RNG): Locus<T> {
  return {
    alleleA: meiosisAllele(parentALocus, rng),
    alleleB: meiosisAllele(parentBLocus, rng),
  };
}

interface CatalogOption<T> {
  value: T;
  dominanceRank: number;
}

function mutateCategorical<T>(
  locus: Locus<T>,
  pool: CatalogOption<T>[],
  rate: number,
  rng: RNG,
): Locus<T> {
  const maybeMutate = (current: Allele<T>): Allele<T> => {
    if (rng() >= rate) return current;
    const replacement = pickRandom(pool, rng);
    return allele(replacement.value, replacement.dominanceRank, 'mutation');
  };
  return { alleleA: maybeMutate(locus.alleleA), alleleB: maybeMutate(locus.alleleB) };
}

function mutateNumeric(locus: Locus<number>, rate: number, rng: RNG, jitter: () => number): Locus<number> {
  const maybeMutate = (current: Allele<number>): Allele<number> => {
    if (rng() >= rate) return current;
    return allele(current.value + jitter(), current.dominanceRank, 'mutation');
  };
  return { alleleA: maybeMutate(locus.alleleA), alleleB: maybeMutate(locus.alleleB) };
}

function corruptToVoid(locus: Locus<TypeId>, chance: number, rng: RNG): Locus<TypeId> {
  const maybeCorrupt = (current: Allele<TypeId>): Allele<TypeId> =>
    rng() < chance ? allele<TypeId>('void', TYPES.void.dominanceRank, 'mutation') : current;
  return { alleleA: maybeCorrupt(locus.alleleA), alleleB: maybeCorrupt(locus.alleleB) };
}

export interface FounderOptions {
  forcedPrimaryType?: CycleTypeId;
}

/** A wild-caught Fusion: homozygous at every locus, i.e. it carries no hidden recessives of its own. */
export function createFounderGenome(rng: RNG, options: FounderOptions = {}): Genome {
  const primaryType = options.forcedPrimaryType ?? pickRandom(BREEDABLE_TYPE_IDS, rng);
  const primaryTypeLocus = homozygousLocus(primaryType, TYPES[primaryType].dominanceRank, 'founder' as const);

  const hasSecondary = rng() < 0.35;
  const secondaryPool = BREEDABLE_TYPE_IDS.filter((id) => id !== primaryType);
  const secondaryValue: SecondaryTypeValue = hasSecondary ? pickRandom(secondaryPool, rng) : NONE_SECONDARY_TYPE;
  const secondaryRank = secondaryValue === NONE_SECONDARY_TYPE ? NONE_TYPE_DOMINANCE_RANK : TYPES[secondaryValue].dominanceRank;
  const secondaryTypeLocus = homozygousLocus(secondaryValue, secondaryRank, 'founder' as const);

  const partLoci = Object.fromEntries(
    PART_CATEGORIES.map((category) => {
      const part = pickWeighted(PARTS_BY_CATEGORY[category], (p) => p.rarityWeight, rng);
      return [category, homozygousLocus(part.id, part.dominanceRank, 'founder' as const)];
    }),
  ) as Genome['partLoci'];

  const statLoci = Object.fromEntries(
    STAT_KEYS.map((stat) => [
      stat,
      Array.from({ length: STAT_LOCI_PER_STAT }, () => {
        const value = Math.floor(rng() * 4) - 1; // -1..2
        return homozygousLocus(value, 0, 'founder' as const);
      }),
    ]),
  ) as Genome['statLoci'];

  const movePool = movesForType(primaryType).concat(
    secondaryValue === NONE_SECONDARY_TYPE ? [] : movesForType(secondaryValue),
  );
  const traitLoci = TRAIT_LOCI.map((locus) => {
    const chosen = rng() < 0.7 ? locus.dominant : locus.recessive;
    return homozygousLocus(chosen.id, chosen.dominant ? 2 : 1, 'founder' as const);
  });
  const moveLoci = Array.from({ length: MOVE_LOCI_COUNT }, () => {
    const dominantMoves = movePool.filter((m) => m.dominant);
    const hiddenMoves = movePool.filter((m) => !m.dominant);
    const pool = rng() < 0.9 || hiddenMoves.length === 0 ? dominantMoves : hiddenMoves;
    const chosen = pickRandom(pool.length > 0 ? pool : MOVES, rng);
    return homozygousLocus(chosen.id, chosen.dominant ? 2 : 1, 'founder' as const);
  });

  const hue = Math.floor(rng() * 360);
  const colorLocus = homozygousLocus(hue, 0, 'founder' as const);

  return {
    id: generateGenomeId(),
    generation: 0,
    parentIds: null,
    visualSeed: Math.floor(rng() * 0xffffffff),
    primaryTypeLocus,
    secondaryTypeLocus,
    partLoci,
    statLoci,
    traitLoci,
    moveLoci,
    colorLocus,
  };
}

export interface BreedOptions {
  mutationRate?: number;
  voidMutationChance?: number;
}

export function breed(parentA: Genome, parentB: Genome, rng: RNG, options: BreedOptions = {}): Genome {
  const baseMutationRate = options.mutationRate ?? MUTATION_RATE;
  const baseVoidChance = options.voidMutationChance ?? VOID_MUTATION_CHANCE;

  const parentAPhenotype = expressPhenotype(parentA, rng);
  const parentBPhenotype = expressPhenotype(parentB, rng);
  const isUnstableLineage =
    parentAPhenotype.traits.includes('unstable_genome') || parentBPhenotype.traits.includes('unstable_genome');
  const mutationRate = isUnstableLineage ? baseMutationRate * UNSTABLE_GENOME_MUTATION_MULTIPLIER : baseMutationRate;
  const voidMutationChance = isUnstableLineage ? baseVoidChance * UNSTABLE_GENOME_MUTATION_MULTIPLIER : baseVoidChance;

  const typePool: CatalogOption<TypeId>[] = BREEDABLE_TYPE_IDS.map((id) => ({
    value: id,
    dominanceRank: TYPES[id].dominanceRank,
  }));
  const secondaryTypePool: CatalogOption<SecondaryTypeValue>[] = [
    ...typePool,
    { value: NONE_SECONDARY_TYPE, dominanceRank: NONE_TYPE_DOMINANCE_RANK },
  ];

  let primaryTypeLocus = inheritLocus(parentA.primaryTypeLocus, parentB.primaryTypeLocus, rng);
  primaryTypeLocus = mutateCategorical(primaryTypeLocus, typePool, mutationRate, rng);
  primaryTypeLocus = corruptToVoid(primaryTypeLocus, voidMutationChance, rng);

  const secondaryTypeLocus = mutateCategorical(
    inheritLocus(parentA.secondaryTypeLocus, parentB.secondaryTypeLocus, rng),
    secondaryTypePool,
    mutationRate,
    rng,
  );

  const partLoci = Object.fromEntries(
    PART_CATEGORIES.map((category) => {
      const pool: CatalogOption<string>[] = PARTS_BY_CATEGORY[category].map((p) => ({
        value: p.id,
        dominanceRank: p.dominanceRank,
      }));
      const inherited = inheritLocus(parentA.partLoci[category], parentB.partLoci[category], rng);
      return [category, mutateCategorical(inherited, pool, mutationRate, rng)];
    }),
  ) as Genome['partLoci'];

  const statLoci = Object.fromEntries(
    STAT_KEYS.map((stat: StatKey) => [
      stat,
      parentA.statLoci[stat].map((_, index) => {
        const inherited = inheritLocus(parentA.statLoci[stat][index], parentB.statLoci[stat][index], rng);
        return mutateNumeric(inherited, mutationRate, rng, () => (rng() < 0.5 ? -1 : 1));
      }),
    ]),
  ) as Genome['statLoci'];

  const traitPool: CatalogOption<string>[] = ALL_TRAIT_ALLELE_IDS.map((id) => ({
    value: id,
    dominanceRank: TRAIT_ALLELES_BY_ID[id].dominant ? 2 : 1,
  }));
  const traitLoci = TRAIT_LOCI.map((_, index) =>
    mutateCategorical(inheritLocus(parentA.traitLoci[index], parentB.traitLoci[index], rng), traitPool, mutationRate, rng),
  );

  const movePool: CatalogOption<string>[] = MOVES.map((move) => ({
    value: move.id,
    dominanceRank: move.dominant ? 2 : 1,
  }));
  const moveLoci = Array.from({ length: MOVE_LOCI_COUNT }, (_, index) =>
    mutateCategorical(inheritLocus(parentA.moveLoci[index], parentB.moveLoci[index], rng), movePool, mutationRate, rng),
  );

  const colorLocus = mutateNumeric(
    inheritLocus(parentA.colorLocus, parentB.colorLocus, rng),
    mutationRate,
    rng,
    () => Math.floor(rng() * 31) - 15,
  );

  return {
    id: generateGenomeId(),
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    parentIds: [parentA.id, parentB.id],
    visualSeed: Math.floor(rng() * 0xffffffff),
    primaryTypeLocus,
    secondaryTypeLocus,
    partLoci,
    statLoci,
    traitLoci,
    moveLoci,
    colorLocus,
  };
}
