import Phaser from 'phaser';
import { breed, createFounderGenome } from '../genetics/breeding';
import { createFusion, type Fusion } from '../genetics/fusion';
import { ConcordRegistry } from '../genetics/registry';
import { mulberry32, randomSeed } from '../genetics/rng';
import { buildCreatureSVG, svgToDataUrl } from '../render/compositeSprite';

/**
 * Debug/demo scene: breeds two random wild Fusions together and renders the
 * two parents plus the offspring using the real catalog + breeding engine,
 * to prove the data pipeline actually produces a usable texture in Phaser.
 * Not part of the eventual game UI.
 */
export class CatalogPreviewScene extends Phaser.Scene {
  private registry_ = new ConcordRegistry();

  constructor() {
    super('CatalogPreviewScene');
  }

  create(): void {
    const parentA = createFusion(createFounderGenome(mulberry32(randomSeed())));
    const parentB = createFusion(createFounderGenome(mulberry32(randomSeed())));
    const offspring = createFusion(breed(parentA.genome, parentB.genome, mulberry32(randomSeed())));

    this.registry_.register(parentA.genome, parentA.phenotype);
    this.registry_.register(parentB.genome, parentB.phenotype);
    const offspringResult = this.registry_.register(offspring.genome, offspring.phenotype);

    this.add
      .text(400, 30, 'Fusionmonsters - Breeding Preview', { fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5, 0);

    this.renderFusion(parentA, 130, 220, 'Parent A');
    this.renderFusion(parentB, 400, 220, 'Parent B');
    this.renderFusion(
      offspring,
      670,
      220,
      offspringResult.isNewDiscovery
        ? 'Offspring - new discovery!'
        : `Offspring - seen x${offspringResult.timesDiscovered}`,
    );
  }

  private renderFusion(fusion: Fusion, x: number, y: number, label: string): void {
    const svg = buildCreatureSVG(fusion.phenotype, fusion.genome.visualSeed);
    const key = `fusion-${fusion.genome.id}`;

    this.textures.once(`addtexture-${key}`, () => {
      this.add.image(x, y, key).setDisplaySize(160, 160);
    });
    this.textures.addBase64(key, svgToDataUrl(svg));

    const { primaryType, secondaryType, traits } = fusion.phenotype;
    const typeLabel = secondaryType ? `${primaryType} / ${secondaryType}` : primaryType;

    this.add.text(x - 75, y + 100, label, { fontSize: '14px', color: '#ffffff' });
    this.add.text(x - 75, y + 120, typeLabel, { fontSize: '12px', color: '#a0c4ff' });
    this.add.text(x - 75, y + 138, traits.join(', '), {
      fontSize: '11px',
      color: '#c9c9c9',
      wordWrap: { width: 150 },
    });
  }
}
