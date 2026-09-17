import type { Genome, Phenotype } from './genome';

/**
 * The Concord registry (see README): a running catalog of every distinct
 * discrete Fusion combination anyone has caught or bred. Continuous values
 * (stats, cosmetic hue) are intentionally excluded from the signature - the
 * registry tracks "species/lineage" combos, not individual stat rolls.
 * Because the combinatorial space is huge, the same signature reappearing
 * is meant to be rare, not prevented.
 */
export interface RegistryEntry {
  signature: string;
  timesDiscovered: number;
  firstGenomeId: string;
  phenotype: Phenotype;
}

export interface RegisterResult {
  signature: string;
  isNewDiscovery: boolean;
  timesDiscovered: number;
}

export class ConcordRegistry {
  private entries = new Map<string, RegistryEntry>();

  computeSignature(phenotype: Phenotype): string {
    return [
      phenotype.primaryType,
      phenotype.secondaryType ?? 'none',
      phenotype.parts.head,
      phenotype.parts.body,
      phenotype.parts.legs,
      phenotype.parts.wings,
      [...phenotype.traits].sort().join(','),
      [...phenotype.moves].sort().join(','),
    ].join('|');
  }

  register(genome: Genome, phenotype: Phenotype): RegisterResult {
    const signature = this.computeSignature(phenotype);
    const existing = this.entries.get(signature);
    if (existing) {
      existing.timesDiscovered += 1;
      return { signature, isNewDiscovery: false, timesDiscovered: existing.timesDiscovered };
    }
    this.entries.set(signature, { signature, timesDiscovered: 1, firstGenomeId: genome.id, phenotype });
    return { signature, isNewDiscovery: true, timesDiscovered: 1 };
  }

  get(signature: string): RegistryEntry | undefined {
    return this.entries.get(signature);
  }

  list(): RegistryEntry[] {
    return [...this.entries.values()];
  }

  get size(): number {
    return this.entries.size;
  }

  /**
   * Replaces the registry's contents wholesale with previously-saved entries
   * (see `src/state/save.ts`), preserving each entry's exact
   * `timesDiscovered`/`firstGenomeId` rather than re-deriving them by
   * calling `register()` once per entry (which would reset
   * `timesDiscovered` to 1 for everything). Used only by save/load restore.
   */
  restore(entries: ReadonlyArray<RegistryEntry>): void {
    this.entries = new Map(entries.map((entry) => [entry.signature, { ...entry }]));
  }
}
