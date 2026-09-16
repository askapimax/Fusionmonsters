/**
 * Small toolkit for authoring body parts as retro pixel-art sprites instead
 * of smooth vector shapes, so they read consistently with a Pokemon-like
 * tile/sprite world later. Parts are still SVG under the hood (kept
 * consistent with the rest of the render pipeline in compositeSprite.ts) -
 * each "pixel" is just a small `<rect>`, run-length-encoded per row so a
 * solid band of same-colored pixels becomes one rect instead of many.
 */

export type PixelOverride = [row: number, col: number, char: string];
export type PixelRow = readonly [start: number, end: number] | null;

/** Builds a horizontally-centered blob from per-row active widths. The
 * first/last active column of each row becomes `edge`, the rest `fill`. */
export function buildBlob(widths: number[], totalCols: number, fill = '1', edge = 'k'): string[] {
  return widths.map((width) => {
    if (width <= 0) return '.'.repeat(totalCols);
    const start = Math.floor((totalCols - width) / 2);
    const chars = new Array(totalCols).fill('.');
    for (let c = start; c < start + width; c++) {
      chars[c] = c === start || c === start + width - 1 ? edge : fill;
    }
    return chars.join('');
  });
}

/** Builds rows from explicit [start,end] column ranges (inclusive) - for
 * asymmetric shapes like wings, where centering doesn't apply. */
export function buildRows(rows: PixelRow[], totalCols: number, fill = '1', edge = 'k'): string[] {
  return rows.map((range) => {
    const chars = new Array(totalCols).fill('.');
    if (range) {
      const [start, end] = range;
      for (let c = start; c <= end; c++) {
        chars[c] = c === start || c === end ? edge : fill;
      }
    }
    return chars.join('');
  });
}

/** Safely pokes individual characters into an existing grid (eyes, shading, decorations). */
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
 * near-black eye/pupil tone and a pale tone for teeth/claws/highlights. */
export function buildPalette(baseColor: string, extra: PixelPalette = {}): PixelPalette {
  return {
    k: shadeColor(baseColor, -55),
    '1': baseColor,
    '2': shadeColor(baseColor, -25),
    '3': shadeColor(baseColor, 25),
    e: '#1a1a1a',
    w: '#f4f0e6',
    ...extra,
  };
}
