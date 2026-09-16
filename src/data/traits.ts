/**
 * Passive trait catalog, organized as six gene loci. Each locus is a
 * classic Mendelian pair: one dominant allele, one recessive allele.
 * Dominant expresses unless an offspring inherits the recessive allele
 * from both parents.
 */

export interface TraitAllele {
  id: string;
  name: string;
  dominant: boolean;
  effect: string;
}

export interface TraitLocusDef {
  id: string;
  theme: string;
  dominant: TraitAllele;
  recessive: TraitAllele;
}

export const TRAIT_LOCI: TraitLocusDef[] = [
  {
    id: 'vitality',
    theme: 'Cellular Repair',
    dominant: { id: 'regenerative', name: 'Regenerative', dominant: true, effect: 'Recovers a small amount of HP at the end of each turn.' },
    recessive: { id: 'brittle_frame', name: 'Brittle Frame', dominant: false, effect: 'Takes slightly increased damage from all attacks.' },
  },
  {
    id: 'concealment',
    theme: 'Surface Markings',
    dominant: { id: 'camouflage', name: 'Camouflage', dominant: true, effect: 'Raises evasion in wild-area encounters.' },
    recessive: { id: 'high_visibility', name: 'High-Visibility Markings', dominant: false, effect: 'Bright, showy patterning. No combat effect, but stands out in the Concord registry.' },
  },
  {
    id: 'bite_chemistry',
    theme: 'Contact Chemistry',
    dominant: { id: 'venomous', name: 'Venomous', dominant: true, effect: 'Contact attacks have a chance to poison the target.' },
    recessive: { id: 'docile_bite', name: 'Docile Bite', dominant: false, effect: 'No secondary effect, but contact attacks are slightly more accurate.' },
  },
  {
    id: 'build',
    theme: 'Frame Density',
    dominant: { id: 'thick_hide', name: 'Thick Hide', dominant: true, effect: 'Raises Defense.' },
    recessive: { id: 'lean_frame', name: 'Lean Frame', dominant: false, effect: 'Raises Speed.' },
  },
  {
    id: 'reflexes',
    theme: 'Nervous System',
    dominant: { id: 'keen_senses', name: 'Keen Senses', dominant: true, effect: 'Raises accuracy and critical-hit chance.' },
    recessive: { id: 'erratic_instincts', name: 'Erratic Instincts', dominant: false, effect: 'Raises critical-hit chance further, but lowers accuracy.' },
  },
  {
    id: 'genomic_stability',
    theme: 'Genomic Stability',
    dominant: { id: 'adaptive_metabolism', name: 'Adaptive Metabolism', dominant: true, effect: 'Resists status effects.' },
    recessive: { id: 'unstable_genome', name: 'Unstable Genome', dominant: false, effect: 'No combat effect, but this Fusion’s offspring have a raised mutation chance - a faint echo of the Unraveling.' },
  },
];

export const TRAIT_ALLELES_BY_ID: Record<string, TraitAllele> = Object.fromEntries(
  TRAIT_LOCI.flatMap((locus) => [
    [locus.dominant.id, locus.dominant],
    [locus.recessive.id, locus.recessive],
  ]),
);

export const ALL_TRAIT_ALLELE_IDS: string[] = Object.keys(TRAIT_ALLELES_BY_ID);
