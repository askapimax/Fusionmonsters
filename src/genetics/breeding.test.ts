import { describe, expect, it } from 'vitest';
import { TYPES, type TypeId } from '../data/types';
import { PARTS_BY_CATEGORY } from '../data/parts';
import { ALL_TRAIT_ALLELE_IDS } from '../data/traits';
import { MOVES } from '../data/moves';
import { expressLocus, expressPhenotype, type Genome, type Locus, type SecondaryTypeValue } from './genome';
import { breed, createFounderGenome } from './breeding';
import { ConcordRegistry } from './registry';
import { mulberry32 } from './rng';

function locus<T>(value: T, dominanceRank: number): Locus<T> {
  return {
    alleleA: { value, dominanceRank, origin: 'founder' },
    alleleB: { value, dominanceRank, origin: 'founder' },
  };
}

describe('createFounderGenome', () => {
  it('produces a homozygous genome (no hidden recessives) at every locus', () => {
    const genome = createFounderGenome(mulberry32(1));
    expect(genome.primaryTypeLocus.alleleA.value).toBe(genome.primaryTypeLocus.alleleB.value);
    for (const category of Object.keys(genome.partLoci) as (keyof Genome['partLoci'])[]) {
      const partLocus = genome.partLoci[category];
      expect(partLocus.alleleA.value).toBe(partLocus.alleleB.value);
    }
  });

  it('always picks parts and moves that exist in the catalog', () => {
    const genome = createFounderGenome(mulberry32(42));
    for (const category of Object.keys(genome.partLoci) as (keyof Genome['partLoci'])[]) {
      const partId = genome.partLoci[category].alleleA.value;
      expect(PARTS_BY_CATEGORY[category].some((p) => p.id === partId)).toBe(true);
    }
    for (const moveLocus of genome.moveLoci) {
      expect(MOVES.some((m) => m.id === moveLocus.alleleA.value)).toBe(true);
    }
  });
});

describe('expressLocus (dominance)', () => {
  it('expresses the higher-dominanceRank allele deterministically', () => {
    const highLow: Locus<string> = {
      alleleA: { value: 'dominant-one', dominanceRank: 9, origin: 'founder' },
      alleleB: { value: 'recessive-one', dominanceRank: 2, origin: 'founder' },
    };
    // Regardless of the coin flip, dominance must decide when ranks differ.
    for (let seed = 0; seed < 20; seed++) {
      expect(expressLocus(highLow, mulberry32(seed))).toBe('dominant-one');
    }
  });
});

describe('breed', () => {
  it('with mutationRate 0, expresses the parent with the higher-ranked type as primary type', () => {
    const rng = mulberry32(7);
    const highRankType = createFounderGenome(rng, { forcedPrimaryType: 'photon' }); // rank 10
    const lowRankType = createFounderGenome(rng, { forcedPrimaryType: 'flora' }); // rank 2

    for (let i = 0; i < 10; i++) {
      const offspring = breed(highRankType, lowRankType, mulberry32(1000 + i), { mutationRate: 0, voidMutationChance: 0 });
      const phenotype = expressPhenotype(offspring, mulberry32(offspring.visualSeed));
      expect(phenotype.primaryType).toBe('photon');
    }
  });

  it('never expresses a dual type unless both parents can contribute a real secondary-type allele', () => {
    const founderA = createFounderGenome(mulberry32(3), { forcedPrimaryType: 'aqua' });
    founderA.secondaryTypeLocus = locus<SecondaryTypeValue>('none', 11);
    const founderB = createFounderGenome(mulberry32(4), { forcedPrimaryType: 'thermal' });
    founderB.secondaryTypeLocus = locus<SecondaryTypeValue>('volt' as TypeId, TYPES.volt.dominanceRank);

    for (let i = 0; i < 15; i++) {
      const offspring = breed(founderA, founderB, mulberry32(2000 + i), { mutationRate: 0, voidMutationChance: 0 });
      const phenotype = expressPhenotype(offspring, mulberry32(offspring.visualSeed));
      expect(phenotype.secondaryType).toBeNull();
    }
  });

  it('with mutationRate 1, still produces only valid catalog values', () => {
    const parentA = createFounderGenome(mulberry32(11));
    const parentB = createFounderGenome(mulberry32(12));
    const offspring = breed(parentA, parentB, mulberry32(13), { mutationRate: 1, voidMutationChance: 0 });

    for (const traitLocus of offspring.traitLoci) {
      expect(ALL_TRAIT_ALLELE_IDS).toContain(traitLocus.alleleA.value);
      expect(ALL_TRAIT_ALLELE_IDS).toContain(traitLocus.alleleB.value);
    }
    for (const category of Object.keys(offspring.partLoci) as (keyof Genome['partLoci'])[]) {
      const partLocus = offspring.partLoci[category];
      expect(PARTS_BY_CATEGORY[category].some((p) => p.id === partLocus.alleleA.value)).toBe(true);
    }
  });

  it('produces a new generation number and records parentage', () => {
    const parentA = createFounderGenome(mulberry32(21));
    const parentB = createFounderGenome(mulberry32(22));
    const offspring = breed(parentA, parentB, mulberry32(23));

    expect(offspring.generation).toBe(1);
    expect(offspring.parentIds).toEqual([parentA.id, parentB.id]);
    expect(offspring.id).not.toBe(parentA.id);
  });
});

describe('ConcordRegistry', () => {
  it('flags the first sighting of a signature as a new discovery and counts repeats', () => {
    const registry = new ConcordRegistry();
    const genome = createFounderGenome(mulberry32(99));
    const phenotype = expressPhenotype(genome, mulberry32(genome.visualSeed));

    const first = registry.register(genome, phenotype);
    expect(first.isNewDiscovery).toBe(true);
    expect(first.timesDiscovered).toBe(1);

    const second = registry.register(genome, phenotype);
    expect(second.isNewDiscovery).toBe(false);
    expect(second.timesDiscovered).toBe(2);
    expect(registry.size).toBe(1);
  });
});
