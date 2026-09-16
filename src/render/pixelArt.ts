/**
 * Pixel-art toolkit for the procedurally-generated Fusion monster parts.
 * Parts are still SVG under the hood (kept consistent with the rest of the
 * render pipeline in compositeSprite.ts) - each "pixel" is a small `<rect>`,
 * run-length-encoded per row so a solid band of same-colored pixels becomes
 * one rect instead of many.
 *
 * A part's silhouette is built from a small list of overlapping ellipses
 * (see `Ellipse`/`unionEllipses`) rather than hand-typed ASCII rows. That
 * gives genuinely smooth, round silhouettes instead of blocky guesses, and
 * `shadeSilhouette` derives a full outline + highlight/shadow ramp from the
 * silhouette's own shape automatically (perimeter = outline, upper-left =
 * lit, lower-right = shadow), so every part gets consistent, correctly-
 * placed shading without hand-tuning each one.
 */

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export type PixelOverride = [row: number, col: number, char: string];

function ellipseContains(shape: Ellipse, col: number, row: number): boolean {
  const nx = (col + 0.5 - shape.cx) / shape.rx;
  const ny = (row + 0.5 - shape.cy) / shape.ry;
  return nx * nx + ny * ny <= 1;
}

/** Unions a list of ellipses into a filled boolean grid - the part's silhouette. */
export function unionEllipses(shapes: Ellipse[], cols: number, rows: number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  if (shapes.length === 0) return grid;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      grid[row][col] = shapes.some((shape) => ellipseContains(shape, col, row));
    }
  }
  return grid;
}

export interface ShadeOptions {
  fill?: string;
  outline?: string;
  highlight?: string;
  shadow?: string;
}

/**
 * Turns a filled silhouette into a palette-key character grid: any filled
 * pixel adjacent to an empty one becomes the outline, and interior pixels
 * are shaded highlight/shadow/base by their position within the
 * silhouette's own bounding box (light from the upper-left, matching the
 * rest of the game's pixel art).
 */
export function shadeSilhouette(filled: boolean[][], options: ShadeOptions = {}): string[] {
  const fill = options.fill ?? '1';
  const outline = options.outline ?? 'k';
  const highlight = options.highlight ?? '3';
  const shadow = options.shadow ?? '2';

  const rows = filled.length;
  const cols = filled[0]?.length ?? 0;
  const isFilled = (r: number, c: number): boolean => r >= 0 && r < rows && c >= 0 && c < cols && filled[r][c];

  let minR = rows;
  let maxR = -1;
  let minC = cols;
  let maxC = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (filled[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  const height = Math.max(1, maxR - minR);
  const width = Math.max(1, maxC - minC);

  const out: string[][] = Array.from({ length: rows }, () => new Array(cols).fill('.'));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!filled[r][c]) continue;
      const isEdge = !isFilled(r - 1, c) || !isFilled(r + 1, c) || !isFilled(r, c - 1) || !isFilled(r, c + 1);
      if (isEdge) {
        out[r][c] = outline;
        continue;
      }
      const u = (c - minC) / width;
      const v = (r - minR) / height;
      if (u < 0.42 && v < 0.38) {
        out[r][c] = highlight;
      } else if (v > 0.68 || (u > 0.72 && v > 0.32)) {
        out[r][c] = shadow;
      } else {
        out[r][c] = fill;
      }
    }
  }
  return out.map((row) => row.join(''));
}

/** Builds a part's shaded grid directly from its ellipse shapes. */
export function buildSilhouette(shapes: Ellipse[], cols: number, rows: number, options: ShadeOptions = {}): string[] {
  return shadeSilhouette(unionEllipses(shapes, cols, rows), options);
}

/** Safely pokes individual characters into an existing grid (eyes, claws, facets, ...). */
export function applyOverrides(rows: string[], overrides: PixelOverride[]): string[] {
  const grid = rows.map((row) => row.split(''));
  for (const [row, col, char] of overrides) {
    if (grid[row] && col >= 0 && col < grid[row].length) {
      grid[row][col] = char;
    }
  }
  return grid.map((row) => row.join(''));
}

export type PixelPalette = Record<string, string>;

/** Renders a grid of palette-key characters into SVG rect markup.
 * `originCol`/`originRow` (in cells) is where local (0,0) sits, matching
 * the anchor conventions in compositeSprite.ts. */
export function renderPixelGrid(
  grid: string[],
  palette: PixelPalette,
  pixelSize: number,
  originCol: number,
  originRow: number,
): string {
  const rects: string[] = [];
  grid.forEach((line, row) => {
    let col = 0;
    while (col < line.length) {
      const ch = line[col];
      const color = palette[ch];
      if (!color) {
        col++;
        continue;
      }
      let runEnd = col + 1;
      while (runEnd < line.length && line[runEnd] === ch) runEnd++;
      const x = (col - originCol) * pixelSize;
      const y = (row - originRow) * pixelSize;
      rects.push(`<rect x="${x}" y="${y}" width="${(runEnd - col) * pixelSize}" height="${pixelSize}" fill="${color}"/>`);
      col = runEnd;
    }
  });
  return rects.join('');
}

function clamp255(value: number): number {
  return Math.min(255, Math.max(0, value));
}

/** Lightens (positive percent) or darkens (negative) a hex color. */
export function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = clamp255(((num >> 16) & 0xff) + amt);
  const g = clamp255(((num >> 8) & 0xff) + amt);
  const b = clamp255((num & 0xff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Standard 4-tone pixel-art ramp derived from a single base color, plus a
 * near-black eye/pupil tone and a pale tone for teeth/claws/highlights.
 * The outline is a fixed near-black (not derived from the base hue) - a
 * consistent dark outline across every part is what makes them read as one
 * coherent style rather than a color-tinted-line cartoon look. */
export function buildPalette(baseColor: string, extra: PixelPalette = {}): PixelPalette {
  return {
    k: '#1c1712',
    '1': baseColor,
    '2': shadeColor(baseColor, -22),
    '3': shadeColor(baseColor, 20),
    e: '#141414',
    w: '#f4f0e6',
    ...extra,
  };
}
