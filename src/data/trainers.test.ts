import { describe, expect, it } from 'vitest';
import { buildTrainerParty, TRAINERS } from './trainers';

describe('trainers catalog', () => {
  it('has at least one trainer with a non-empty party', () => {
    const ids = Object.keys(TRAINERS);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const trainer = TRAINERS[id];
      expect(trainer.party.length).toBeGreaterThan(0);
      expect(trainer.name.length).toBeGreaterThan(0);
    }
  });

  it('includes the example Fernbrook scout trainer', () => {
    expect(TRAINERS.fernbrook_scout).toBeDefined();
    expect(TRAINERS.fernbrook_scout.party[0].phenotype.primaryType).toBe('aero');
  });
});

describe('buildTrainerParty determinism', () => {
  it('produces the same phenotype(s) every time for the same seed', () => {
    const seed = 0x1234abcd;
    const a = buildTrainerParty(seed, 2);
    const b = buildTrainerParty(seed, 2);

    expect(a.length).toBe(2);
    expect(b.length).toBe(2);
    a.forEach((fusion, index) => {
      expect(fusion.phenotype).toEqual(b[index].phenotype);
      expect(fusion.genome.visualSeed).toBe(b[index].genome.visualSeed);
    });
  });

  it('respects forcedPrimaryType', () => {
    const [fusion] = buildTrainerParty(42, 1, { forcedPrimaryType: 'toxin' });
    expect(fusion.phenotype.primaryType).toBe('toxin');
  });

  it('always returns at least one Fusion even when count is 0 or negative', () => {
    expect(buildTrainerParty(1, 0).length).toBe(1);
    expect(buildTrainerParty(1, -3).length).toBe(1);
  });
});
