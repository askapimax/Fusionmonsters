import { PARTS_BY_ID, type PartCategory } from '../data/parts';
import type { Phenotype } from '../genetics/genome';
import { mulberry32 } from '../genetics/rng';

const CANVAS_SIZE = 128;

/** Single anchor per category; paired parts (legs/wings) draw both sides
 * within their own SVG fragment (see `mirror` in data/parts.ts). */
const ANCHORS: Record<PartCategory, [number, number]> = {
  wings: [64, 58],
  legs: [64, 88],
  body: [64, 66],
  head: [64, 28],
};

/** Draw order, back to front. */
const DRAW_ORDER: PartCategory[] = ['wings', 'legs', 'body', 'head'];

/**
 * Builds a full creature SVG by layering the phenotype's parts onto shared
 * anchors, and applies a small per-individual hue/scale jitter derived from
 * the Fusion's own visualSeed - the "little random factor" on top of pure
 * inheritance. Two Fusions with identical genetics still render identically
 * (same seed -> same jitter), but no two individuals look bit-for-bit alike.
 */
export function buildCreatureSVG(phenotype: Phenotype, visualSeed: number): string {
  const rng = mulberry32(visualSeed);
  const layers: string[] = [];

  for (const category of DRAW_ORDER) {
    const part = PARTS_BY_ID[phenotype.parts[category]];
    if (!part || !part.svg) continue;
    const [x, y] = ANCHORS[category];
    const hueJitter = Math.round((rng() - 0.5) * 40); // -20..20 degrees
    layers.push(
      `<g transform="translate(${x},${y})" style="filter:hue-rotate(${hueJitter}deg)">${part.svg}</g>`,
    );
  }

  const baseHueShift = Math.round(phenotype.hue - 180); // creature-wide tint from the inherited color gene
  const scaleJitter = 0.92 + rng() * 0.16; // 0.92 - 1.08
  const half = CANVAS_SIZE / 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">` +
    `<g style="filter:hue-rotate(${baseHueShift}deg)">` +
    `<g transform="translate(${half},${half}) scale(${scaleJitter}) translate(${-half},${-half})">` +
    layers.join('') +
    `</g></g></svg>`
  );
}

export function svgToDataUrl(svg: string): string {
  const encoded =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}
