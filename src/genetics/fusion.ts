import { expressPhenotype, type Genome, type Phenotype } from './genome';
import { mulberry32 } from './rng';

export interface Fusion {
  genome: Genome;
  phenotype: Phenotype;
  nickname?: string;
}

/** Expresses a genome's phenotype deterministically from its own visualSeed. */
export function createFusion(genome: Genome, nickname?: string): Fusion {
  const rng = mulberry32(genome.visualSeed);
  const phenotype = expressPhenotype(genome, rng);
  return { genome, phenotype, nickname };
}
