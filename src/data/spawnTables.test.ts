import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../genetics/rng';
import { BREEDABLE_TYPE_IDS } from './types';
import { generateWildFusion } from './wildEncounters';
import { pickSpawnType, ZONE_SPAWN_TABLES, type SpawnTable } from './spawnTables';

describe('ZONE_SPAWN_TABLES', () => {
  it('weights every breedable type for every zone (rare, not absent)', () => {
    for (const table of Object.values(ZONE_SPAWN_TABLES)) {
      const weightedTypes = table.map((entry) => entry.type);
      for (const typeId of BREEDABLE_TYPE_IDS) {
        expect(weightedTypes).toContain(typeId);
      }
      for (const entry of table) {
        expect(entry.weight).toBeGreaterThan(0);
      }
    }
  });
});

describe('pickSpawnType', () => {
  const table: SpawnTable = [
    { type: 'flora', weight: 10 },
    { type: 'photon', weight: 1 },
  ];

  it('only ever returns a type listed in the table', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      expect(['flora', 'photon']).toContain(pickSpawnType(table, rng));
    }
  });

  it('picks the heavily-weighted type far more often than the rare one', () => {
    const rng = mulberry32(5);
    const counts = { flora: 0, photon: 0 };
    for (let i = 0; i < 500; i++) {
      counts[pickSpawnType(table, rng) as 'flora' | 'photon']++;
    }
    expect(counts.flora).toBeGreaterThan(counts.photon * 3);
  });
});

describe('generateWildFusion', () => {
  const table: SpawnTable = [{ type: 'thermal', weight: 1 }];

  it('forces the primary type to one from the given spawn table', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 10; i++) {
      const fusion = generateWildFusion(rng, table);
      expect(fusion.phenotype.primaryType).toBe('thermal');
    }
  });

  it('falls back to a fully random type when no spawn table is given', () => {
    const rng = mulberry32(9);
    const fusion = generateWildFusion(rng);
    expect(BREEDABLE_TYPE_IDS).toContain(fusion.phenotype.primaryType);
  });
});
