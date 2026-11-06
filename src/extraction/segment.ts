import { Category, GarmentKind } from '../types';

/**
 * Local cutout segmentation.
 *
 * This is deliberately a small, deterministic algorithm rather than a network
 * service: photos stay on the device. It is tuned for the useful case — one
 * garment laid flat or held up against a surface that differs from the fabric.
 *
 * The pipeline estimates the background from the photo border, separates the
 * largest foreground shape, keeps true openings (collars, bag handles) clear,
 * feathers the edge, trims to the garment, reads its dominant colour and
 * classifies the silhouette.
 */

export type Bounds = { x: number; y: number; width: number; height: number };

export type ShapeMetrics = {
  aspect: number;
  fill: number;
  maxRowAt: number;
  topWidth: number;
  midWidth: number;
  lowerWidth: number;
  bottomWidth: number;
  splitRows: number;
  /** separate runs where the piece ends: two legs split, a hem does not */
  bottomRuns: number;
  /** rows near the shoulders that break into three runs: sleeve, body, sleeve */
  sleeveRows: number;
  /** how far down the piece the sleeves run: short sleeves stop early */
  sleeveReach: number;
  /** width of the very top of the piece: a hood makes it narrow */
  crownWidth: number;
  /** how far down the piece stays narrow before the shoulders: a hood is deep */
  crownDepth: number;
  holeRatio: number;
  edgeContact: number;
};

export type CutoutColor = {
  hex: string;
  name: string;
  family: 'neutral' | 'earth' | 'cool' | 'warm';
  accent: string;
  luminance: number;
};

export type GarmentGuess = {
  kind: GarmentKind;
  category: Category;
  noun: string;
  confidence: number;
};

export type Segmentation = {
  alpha: Uint8Array;
  bounds: Bounds;
  shape: ShapeMetrics;
  color: CutoutColor;
  pattern: 'striped' | 'plaid' | null;
  kind: GarmentKind;
  category: Category;
  noun: string;
  name: string;
  confidence: number;
};

export type SegmentFailure = {
  code: 'no-garment' | 'no-background' | 'too-small' | 'unreadable';
  message: string;
};

export type SegmentOutcome =
  | { ok: true; segmentation: Segmentation }
  | { ok: false; failure: SegmentFailure };

type Rgb = [number, number, number];
type ColorEntry = { name: string; hex: string; family: CutoutColor['family'] };

const COLORWAYS: ColorEntry[] = [
  { name: 'black', hex: '#1b1a18', family: 'neutral' },
  { name: 'charcoal', hex: '#3d3c39', family: 'neutral' },
  { name: 'grey', hex: '#8d8b85', family: 'neutral' },
  { name: 'stone', hex: '#b8b1a3', family: 'neutral' },
  { name: 'cream', hex: '#e7dfd0', family: 'neutral' },
  { name: 'white', hex: '#f3f0e9', family: 'neutral' },
  { name: 'sand', hex: '#cbb798', family: 'earth' },
  { name: 'tan', hex: '#b28c60', family: 'earth' },
  { name: 'brown', hex: '#795a42', family: 'earth' },
  { name: 'rust', hex: '#a25e3d', family: 'earth' },
  { name: 'burgundy', hex: '#5e2a32', family: 'warm' },
  { name: 'red', hex: '#b33a30', family: 'warm' },
  { name: 'coral', hex: '#c76d58', family: 'warm' },
  { name: 'pink', hex: '#d8a4ae', family: 'warm' },
  { name: 'olive', hex: '#6d6e4a', family: 'earth' },
  { name: 'green', hex: '#5c7b5b', family: 'earth' },
  { name: 'forest', hex: '#2f4a39', family: 'cool' },
  { name: 'seafoam', hex: '#a9c7bb', family: 'cool' },
  { name: 'teal', hex: '#3c7074', family: 'cool' },
  { name: 'navy', hex: '#25334b', family: 'cool' },
  { name: 'blue', hex: '#476b94', family: 'cool' },
  { name: 'pale blue', hex: '#b7cfda', family: 'cool' },
  { name: 'indigo', hex: '#403f66', family: 'cool' },
  { name: 'lavender', hex: '#b3a6c9', family: 'cool' },
  { name: 'purple', hex: '#6a4f74', family: 'cool' },
  { name: 'mustard', hex: '#b48a3d', family: 'earth' },
  { name: 'yellow', hex: '#d8c26a', family: 'warm' },
  { name: 'orange', hex: '#c47b3f', family: 'warm' },
];

/** The same named colours the detector uses, so an edit stays consistent. */
export type GarmentColorway = { name: string; hex: string; family: CutoutColor['family'] };

export const GARMENT_COLORWAYS: GarmentColorway[] = COLORWAYS;

export function accentFor(hex: string): string {
  return shade(hex, 0.82);
}

const NOUN: Record<GarmentKind, string> = {
  tee: 'tee',
  shirt: 'shirt',
  knit: 'knit',
  hoodie: 'hoodie',
  flannel: 'flannel',
  trousers: 'trousers',
  jeans: 'jeans',
  shorts: 'shorts',
  jacket: 'jacket',
  coat: 'coat',
  sneaker: 'sneakers',
  boot: 'boots',
  loafer: 'loafers',
  cap: 'cap',
  bag: 'bag',
};

export const SEGMENT_FAILURES: Record<SegmentFailure['code'], SegmentFailure> = {
  'no-garment': {
    code: 'no-garment',
    message: 'we couldn’t find a clear garment shape here. try a photo with one piece and a little space around it.',
  },
  'no-background': {
    code: 'no-background',
    message: 'the piece fills the whole frame. leave a margin of surface around it and try again.',
  },
  'too-small': {
    code: 'too-small',
    message: 'the piece was too small to cut out cleanly. move closer and keep the whole garment in frame.',
  },
  unreadable: {
    code: 'unreadable',
    message: 'this file couldn’t be read as an image.',
  },
};

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function rgbDistance(r: number, g: number, b: number, center: Rgb): number {
  const dr = r - center[0];
  const dg = g - center[1];
  const db = b - center[2];
  // Green carries more of perceived colour, blue more than red.
  return Math.sqrt(dr * dr * 0.8 + dg * dg * 1.25 + db * db * 0.95);
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (factor >= 1) {
    return toHex(r + (255 - r) * (factor - 1), g + (255 - g) * (factor - 1), b + (255 - b) * (factor - 1));
  }
  return toHex(r * factor, g * factor, b * factor);
}

/** Border colours are a cheap, robust estimate of the surface behind the piece. */
function backgroundCenters(data: Uint8Array, width: number, height: number): Rgb[] {
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.045));
  const samples: Rgb[] = [];
  // Bitmask of the frame sides each sample sits on: 1 top, 2 right, 4 bottom, 8 left.
  const sides: number[] = [];
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      if (x >= band && x < width - band && y >= band && y < height - band) continue;
      let sideMask = 0;
      if (y < band) sideMask |= 1;
      if (x >= width - band) sideMask |= 2;
      if (y >= height - band) sideMask |= 4;
      if (x < band) sideMask |= 8;
      if (sideMask === 0) continue;
      const index = (y * width + x) * 4;
      samples.push([data[index], data[index + 1], data[index + 2]]);
      sides.push(sideMask);
    }
  }
  if (samples.length < 8) return [[240, 240, 240]];

  const k = Math.min(5, samples.length);
  const centers: Rgb[] = [samples[0]];
  while (centers.length < k) {
    let bestIndex = 0;
    let bestDistance = -1;
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i];
      let nearest = Infinity;
      for (const center of centers) {
        nearest = Math.min(nearest, rgbDistance(sample[0], sample[1], sample[2], center));
      }
      if (nearest > bestDistance) {
        bestDistance = nearest;
        bestIndex = i;
      }
    }
    centers.push(samples[bestIndex]);
  }

  for (let iteration = 0; iteration < 7; iteration += 1) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i];
      let nearestIndex = 0;
      let nearest = Infinity;
      for (let c = 0; c < centers.length; c += 1) {
        const distance = rgbDistance(sample[0], sample[1], sample[2], centers[c]);
        if (distance < nearest) {
          nearest = distance;
          nearestIndex = c;
        }
      }
      const bucket = sums[nearestIndex];
      bucket[0] += sample[0];
      bucket[1] += sample[1];
      bucket[2] += sample[2];
      bucket[3] += 1;
    }
    sums.forEach((bucket, index) => {
      if (bucket[3] > 0) {
        centers[index] = [bucket[0] / bucket[3], bucket[1] / bucket[3], bucket[2] / bucket[3]];
      }
    });
  }

  // A piece that runs off the frame edge is sampled as "border" too, which turns
  // the fabric into the estimated surface and inverts the whole cutout. The
  // surface surrounds the piece, so it shows up on most sides of the frame; a
  // garment that merely runs off an edge appears on only one or two.
  const sideSets = centers.map(() => 0);
  for (let i = 0; i < samples.length; i += 1) {
    let best = 0;
    let bestDistance = Infinity;
    for (let c = 0; c < centers.length; c += 1) {
      const distance = rgbDistance(samples[i][0], samples[i][1], samples[i][2], centers[c]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = c;
      }
    }
    sideSets[best] |= sides[i];
  }
  const sideCount = (mask: number) =>
    Number(Boolean(mask & 1)) + Number(Boolean(mask & 2)) + Number(Boolean(mask & 4)) + Number(Boolean(mask & 8));
  const surrounding = centers.filter((_, c) => sideCount(sideSets[c]) >= 3);
  if (surrounding.length > 0) return surrounding;
  const partial = centers.filter((_, c) => sideCount(sideSets[c]) >= 2);
  return partial.length > 0 ? partial : centers;
}

/** Otsu threshold over border-to-colour distances, kept inside a useful range. */
function otsuThreshold(histogram: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < histogram.length; i += 1) sum += i * histogram[i];
  let sumBackground = 0;
  let weightBackground = 0;
  let best = 0;
  let bestVariance = -1;
  for (let i = 0; i < histogram.length; i += 1) {
    weightBackground += histogram[i];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;
    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground * weightForeground * (meanBackground - meanForeground) * (meanBackground - meanForeground);
    if (variance > bestVariance) {
      bestVariance = variance;
      best = i;
    }
  }
  return best;
}

function borderSpread(data: Uint8Array, width: number, height: number, centers: Rgb[]): number {
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.045));
  const values: number[] = [];
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      if (x >= band && x < width - band && y >= band && y < height - band) continue;
      const index = (y * width + x) * 4;
      let nearest = Infinity;
      for (const center of centers) {
        nearest = Math.min(nearest, rgbDistance(data[index], data[index + 1], data[index + 2], center));
      }
      values.push(nearest);
    }
  }
  if (values.length === 0) return 8;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length * 0.95)];
}

type Component = { label: number; area: number; x0: number; y0: number; x1: number; y1: number };

function largestComponents(
  foreground: Uint8Array,
  width: number,
  height: number,
): { labels: Int32Array; selected: Component[]; largest: Component } | null {
  const total = width * height;
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  const components: Component[] = [];
  let nextLabel = 1;

  for (let start = 0; start < total; start += 1) {
    if (foreground[start] === 0 || labels[start] !== 0) continue;
    const label = nextLabel;
    nextLabel += 1;
    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    labels[start] = label;
    let area = 0;
    let x0 = width;
    let y0 = height;
    let x1 = 0;
    let y1 = 0;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      area += 1;
      const x = index % width;
      const y = (index - x) / width;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let oy = -1; oy <= 1; oy += 1) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) continue;
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox === 0 && oy === 0) continue;
          const nx = x + ox;
          if (nx < 0 || nx >= width) continue;
          const neighbor = ny * width + nx;
          if (foreground[neighbor] === 1 && labels[neighbor] === 0) {
            labels[neighbor] = label;
            queue[tail] = neighbor;
            tail += 1;
          }
        }
      }
    }

    components.push({ label, area, x0, y0, x1, y1 });
  }

  if (components.length === 0) return null;
  const largest = components.reduce((a, b) => (b.area > a.area ? b : a));
  const selected = components.filter((component) => {
    if (component === largest) return true;
    if (component.area < Math.max(largest.area * 0.12, total * 0.0015)) return false;
    const overlapX =
      Math.min(component.x1, largest.x1 + (largest.x1 - largest.x0) * 0.25) -
      Math.max(component.x0, largest.x0 - (largest.x1 - largest.x0) * 0.25);
    const overlapY =
      Math.min(component.y1, largest.y1 + (largest.y1 - largest.y0) * 0.25) -
      Math.max(component.y0, largest.y0 - (largest.y1 - largest.y0) * 0.25);
    return overlapX > 0 && overlapY > 0;
  });
  return { labels, selected, largest };
}

function erodeMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (
        mask[index] === 1 &&
        mask[index - 1] === 1 &&
        mask[index + 1] === 1 &&
        mask[index - width] === 1 &&
        mask[index + width] === 1
      ) {
        output[index] = 1;
      }
    }
  }
  return output;
}

function trimBounds(alpha: Uint8Array, width: number, height: number): Bounds | null {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha[y * width + x] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < x0 || y1 < y0) return null;
  const pad = Math.round(Math.min(width, height) * 0.012);
  const left = clamp(x0 - pad, 0, width - 1);
  const top = clamp(y0 - pad, 0, height - 1);
  const right = clamp(x1 + pad, 0, width - 1);
  const bottom = clamp(y1 + pad, 0, height - 1);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function feather(alpha: Uint8Array, width: number, height: number): void {
  const temp = new Uint8Array(alpha.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const left = x > 0 ? alpha[index - 1] : alpha[index];
      const right = x < width - 1 ? alpha[index + 1] : alpha[index];
      temp[index] = (left + alpha[index] * 2 + right) / 4;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const up = y > 0 ? temp[index - width] : temp[index];
      const down = y < height - 1 ? temp[index + width] : temp[index];
      alpha[index] = Math.round((up + temp[index] * 2 + down) / 4);
    }
  }
}

/** One-pixel closing: seals pinholes and notches without merging separate parts. */
function closeMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const at = (values: Uint8Array, x: number, y: number) =>
    values[clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)];
  const grown = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 0;
      for (let dy = -1; dy <= 1 && on === 0; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (at(mask, x + dx, y + dy) === 1) {
            on = 1;
            break;
          }
        }
      }
      grown[y * width + x] = on;
    }
  }
  const closed = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let on = 1;
      for (let dy = -1; dy <= 1 && on === 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (at(grown, x + dx, y + dy) === 0) {
            on = 0;
            break;
          }
        }
      }
      closed[y * width + x] = on;
    }
  }
  return closed;
}

function rowExtent(alpha: Uint8Array, width: number, y: number, bounds: Bounds): { width: number; runs: number[] } {
  const runs: number[] = [];
  let runStart = -1;
  for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
    const on = alpha[y * width + x] > 127;
    if (on && runStart < 0) runStart = x;
    if (!on && runStart >= 0) {
      runs.push(x - runStart);
      runStart = -1;
    }
  }
  if (runStart >= 0) runs.push(bounds.x + bounds.width - runStart);
  return { width: runs.reduce((sum, value) => sum + value, 0), runs };
}

function shapeMetrics(
  alpha: Uint8Array,
  width: number,
  height: number,
  bounds: Bounds,
  area: number,
  holeArea: number,
): ShapeMetrics {
  const widthAt = (fraction: number) => {
    const y = clamp(Math.round(bounds.y + bounds.height * fraction), 0, height - 1);
    return rowExtent(alpha, width, y, bounds).width / bounds.width;
  };

  let maxRowWidth = 0;
  let maxRowAt = 0;
  let splitRows = 0;
  let sleeveRows = 0;
  const minRun = bounds.width * 0.12;
  const rowWidths: number[] = [];
  const rowCount = Math.max(1, Math.round(bounds.height / 4));
  for (let row = 0; row < rowCount; row += 1) {
    const fraction = row / rowCount;
    const y = clamp(Math.round(bounds.y + fraction * bounds.height), 0, height - 1);
    const extent = rowExtent(alpha, width, y, bounds);
    rowWidths.push(extent.width / bounds.width);
    if (extent.width > maxRowWidth) {
      maxRowWidth = extent.width;
      maxRowAt = fraction;
    }
    const meaningful = extent.runs.filter((run) => run >= minRun).length;
    if (fraction > 0.5 && meaningful >= 2) splitRows += 1;
    // Left sleeve, body, right sleeve: the signature of a long-sleeve top, and
    // never of a pair of legs.
    if (fraction > 0.12 && fraction < 0.45 && meaningful >= 3) sleeveRows += 1;
  }
  // Two runs at the very bottom mean the piece divides into legs. A hem with
  // sleeves hanging past it can also split, which is why sleeveRows and this
  // run count are read together in classify().
  // Sleeve length: the deepest row that is still as wide as the shoulders.
  // Short sleeves stop around a third of the way down; long sleeves run on.
  const widest = bounds.width === 0 ? 0 : maxRowWidth / bounds.width;
  let deepestWide = 0;
  for (let row = 0; row < rowWidths.length; row += 1) {
    if (rowWidths[row] >= widest * 0.85) deepestWide = row;
  }
  const sleeveReach = rowWidths.length > 0 ? (deepestWide + 1) / rowWidths.length : 0;
  // A hood holds the piece narrow for a while before the shoulders start; a
  // neckline notch is only a few percent deep.
  const shoulderRow = rowWidths.findIndex((value) => value >= widest * 0.7);
  const crownDepth = rowWidths.length > 0 && shoulderRow > 0 ? shoulderRow / rowWidths.length : 0;
  const lastRow = rowExtent(alpha, width, clamp(Math.round(bounds.y + bounds.height * 0.94), 0, height - 1), bounds);
  const bottomRuns = lastRow.runs.filter((run) => run >= minRun).length;

  let borderPixels = 0;
  let borderForeground = 0;
  for (let x = 0; x < width; x += 1) {
    borderPixels += 2;
    if (alpha[x] > 127) borderForeground += 1;
    if (alpha[(height - 1) * width + x] > 127) borderForeground += 1;
  }
  for (let y = 0; y < height; y += 1) {
    borderPixels += 2;
    if (alpha[y * width] > 127) borderForeground += 1;
    if (alpha[y * width + width - 1] > 127) borderForeground += 1;
  }

  return {
    aspect: bounds.width / bounds.height,
    fill: area / (bounds.width * bounds.height),
    maxRowAt,
    topWidth: widthAt(0.18),
    midWidth: widthAt(0.55),
    lowerWidth: widthAt(0.78),
    bottomWidth: widthAt(0.9),
    splitRows,
    bottomRuns,
    sleeveRows,
    sleeveReach,
    crownWidth: widthAt(0.03),
    crownDepth,
    holeRatio: holeArea / (bounds.width * bounds.height),
    edgeContact: borderPixels === 0 ? 0 : borderForeground / borderPixels,
  };
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  return max <= 1 ? 0 : (max - Math.min(r, g, b)) / max;
}

/**
 * A cast shadow keeps the surface's hue and only loses brightness. A hard
 * shadow against a bright surface is nearly black, which luma alone cannot
 * tell apart from black cotton, so saturation decides: black and navy fabric
 * are near-neutral, while the shadow of a coloured surface stays coloured.
 */
function isShadowedSurface(r: number, g: number, b: number, centers: Rgb[]): boolean {
  const pixelLuma = luma(r, g, b);
  const sumPixel = r + g + b + 1;
  const pr = r / sumPixel;
  const pg = g / sumPixel;
  const pb = b / sumPixel;
  const pixelSaturation = saturation(r, g, b);
  for (const center of centers) {
    const centerLuma = luma(center[0], center[1], center[2]);
    if (centerLuma < 16) continue;
    const factor = pixelLuma / centerLuma;
    if (factor >= 0.99) continue;
    const sumCenter = center[0] + center[1] + center[2] + 1;
    const chroma = Math.hypot(
      pr - center[0] / sumCenter,
      pg - center[1] / sumCenter,
      pb - center[2] / sumCenter,
    );
    // Same hue family as this surface shade, only darker.
    if (chroma >= 0.07) continue;
    // A moderate darkening of any surface is a shadow.
    if (factor > 0.35) return true;
    // A hard, nearly black shadow is only a shadow when it is still coloured;
    // neutral dark pixels are fabric.
    if (saturation(center[0], center[1], center[2]) > 0.18 && pixelSaturation > 0.18) return true;
  }
  return false;
}

/**
 * How a colour relates to the surface behind the piece. `distinct` is the
 * distance to the closest border colour; `shadowed` marks a same-hue, darker
 * copy of the surface (a cast shadow, never fabric).
 */
function surfaceRelation(r: number, g: number, b: number, centers: Rgb[]): { distinct: number; shadowed: boolean } {
  let distinct = Infinity;
  for (const center of centers) distinct = Math.min(distinct, rgbDistance(r, g, b, center));
  return { distinct: distinct === Infinity ? 0 : distinct, shadowed: isShadowedSurface(r, g, b, centers) };
}

/** Mean colour of one connected component, used to spot an inverted mask. */
/** Mean colour of the kept mask and of the gaps inside its crop, for one check. */
function boundsMeans(
  mask: Uint8Array,
  data: Uint8Array,
  width: number,
  bounds: Bounds,
): { piece: Rgb; gap: Rgb; gapShare: number } {
  let pieceCount = 0;
  let gapCount = 0;
  let pr = 0;
  let pg = 0;
  let pb = 0;
  let gr = 0;
  let gg = 0;
  let gb = 0;
  const pixels = bounds.width * bounds.height;
  for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      const index = y * width + x;
      const dataIndex = index * 4;
      if (mask[index] === 1) {
        pr += data[dataIndex];
        pg += data[dataIndex + 1];
        pb += data[dataIndex + 2];
        pieceCount += 1;
      } else {
        gr += data[dataIndex];
        gg += data[dataIndex + 1];
        gb += data[dataIndex + 2];
        gapCount += 1;
      }
    }
  }
  const piece: Rgb = pieceCount > 0 ? [pr / pieceCount, pg / pieceCount, pb / pieceCount] : [128, 128, 128];
  const gap: Rgb = gapCount > 0 ? [gr / gapCount, gg / gapCount, gb / gapCount] : [128, 128, 128];
  return { piece, gap, gapShare: pixels > 0 ? gapCount / pixels : 0 };
}

function componentMeanColor(labels: Int32Array, label: number, data: Uint8Array, total: number): Rgb {
  let count = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let index = 0; index < total; index += 1) {
    if (labels[index] !== label) continue;
    const dataIndex = index * 4;
    r += data[dataIndex];
    g += data[dataIndex + 1];
    b += data[dataIndex + 2];
    count += 1;
  }
  if (count === 0) return [128, 128, 128];
  return [r / count, g / count, b / count];
}

function dominantColor(
  data: Uint8Array,
  alpha: Uint8Array,
  width: number,
  bounds: Bounds,
  centers: Rgb[],
  threshold: number,
): CutoutColor {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  // Stay well inside the crop: the surface at the silhouette edge must not be
  // able to out-vote the fabric the piece is actually made of.
  const left = Math.round(bounds.x + bounds.width * 0.2);
  const right = Math.round(bounds.x + bounds.width * 0.8);
  const top = Math.round(bounds.y + bounds.height * 0.2);
  const bottom = Math.round(bounds.y + bounds.height * 0.8);

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const index = y * width + x;
      if (alpha[index] < 180) continue;
      const dataIndex = index * 4;
      const r = data[dataIndex];
      const g = data[dataIndex + 1];
      const b = data[dataIndex + 2];
      // 5 bits per channel keeps shade variation together without losing colour.
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }
  }

  // Rank shades by coverage, discounted by how much they resemble the surface.
  // Counting raw pixels titled a black tee on a pale mattress "white", because
  // the pale pixels inside the crop out-voted the fabric.
  const surfaceFloor = Math.max(12, threshold * 0.5);
  let dominant = { score: -1, r: 242, g: 239, b: 232 };
  for (const bucket of buckets.values()) {
    const br = bucket.r / bucket.count;
    const bg = bucket.g / bucket.count;
    const bb = bucket.b / bucket.count;
    const relation = surfaceRelation(br, bg, bb, centers);
    const weight = relation.shadowed || relation.distinct < surfaceFloor ? bucket.count * 0.12 : bucket.count;
    const score = weight * (0.35 + Math.min(1, relation.distinct / 96));
    if (score > dominant.score) dominant = { score, r: br, g: bg, b: bb };
  }
  const r = dominant.r;
  const g = dominant.g;
  const b = dominant.b;
  const hex = toHex(r, g, b);

  let nearest = COLORWAYS[0];
  let nearestDistance = Infinity;
  for (const entry of COLORWAYS) {
    const [er, eg, eb] = hexToRgb(entry.hex);
    // Compare in a perceptual-ish weighted RGB space, then bias away from
    // near-neutrals so a pale blue piece doesn't become "stone".
    const distance = Math.sqrt((r - er) ** 2 * 0.8 + (g - eg) ** 2 * 1.2 + (b - eb) ** 2 * 0.9);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = entry;
    }
  }

  return {
    hex,
    name: nearest.name,
    family: nearest.family,
    accent: shade(hex, 0.82),
    luminance: luma(r, g, b) / 255,
  };
}

function bandStats(series: number[]): { range: number; turns: number } {
  if (series.length < 8) return { range: 0, turns: 0 };
  const smooth = series.map((value, index) => {
    const before = series[Math.max(0, index - 1)];
    const after = series[Math.min(series.length - 1, index + 1)];
    return (before + value * 2 + after) / 4;
  });
  const sorted = [...smooth].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * 0.1)];
  const high = sorted[Math.floor(sorted.length * 0.9)];
  // Bands are read as crossings of the middle level, not as strict direction
  // changes: a woven stripe has flat plateaus, so a difference-of-differences
  // test sees nothing to alternate.
  const midpoint = (low + high) / 2;
  let turns = 0;
  let above = smooth[0] >= midpoint;
  for (const value of smooth) {
    const next = value >= midpoint;
    if (next !== above) {
      turns += 1;
      above = next;
    }
  }
  return { range: high - low, turns };
}

/**
 * Stripes run one way, a check runs both ways. Bands are read across the piece
 * and down it; only a weave that alternates in both directions is a check.
 */
function fabricPattern(
  data: Uint8Array,
  alpha: Uint8Array,
  width: number,
  bounds: Bounds,
): 'striped' | 'plaid' | null {
  const start = Math.round(bounds.y + bounds.height * 0.12);
  const end = Math.round(bounds.y + bounds.height * 0.88);
  const left = Math.round(bounds.x + bounds.width * 0.16);
  const right = Math.round(bounds.x + bounds.width * 0.84);
  const inside = (index: number) => alpha[index] >= 140;
  const lumaAt = (index: number) => {
    const dataIndex = index * 4;
    return luma(data[dataIndex], data[dataIndex + 1], data[dataIndex + 2]);
  };

  const rowMeans: number[] = [];
  for (let y = start; y <= end; y += 1) {
    let sum = 0;
    let count = 0;
    for (let x = left; x <= right; x += 1) {
      const index = y * width + x;
      if (!inside(index)) continue;
      sum += lumaAt(index);
      count += 1;
    }
    if (count >= (right - left) * 0.28) rowMeans.push(sum / count);
  }
  const rows = bandStats(rowMeans);
  if (rows.turns < 4 || rows.range <= 30) return null;

  const columnStep = Math.max(1, Math.round((right - left) / 150));
  const columnMeans: number[] = [];
  for (let x = left; x <= right; x += columnStep) {
    let sum = 0;
    let count = 0;
    for (let y = start; y <= end; y += 2) {
      const index = y * width + x;
      if (!inside(index)) continue;
      sum += lumaAt(index);
      count += 1;
    }
    if (count >= ((end - start) / 2) * 0.3) columnMeans.push(sum / count);
  }
  const columns = bandStats(columnMeans);
  return columns.turns >= 4 && columns.range > 18 ? 'plaid' : 'striped';
}

function classify(shape: ShapeMetrics, color: CutoutColor, pattern: 'striped' | 'plaid' | null): GarmentGuess {
  // A split silhouette is only bottoms when the piece actually ends in two
  // separate runs. A long-sleeve polo splits too — the gaps between its sleeves
  // and its body — and used to be titled "shorts" because the splits were read
  // as legs. Sleeve rows above and a solid hem mean it is a top.
  const legs = shape.bottomRuns === 2 && shape.sleeveRows < 2;
  const bottomShape = legs && (shape.splitRows >= 3 || (shape.splitRows >= 2 && shape.aspect < 1.35));

  if (bottomShape) {
    if (shape.aspect < 0.85) {
      const denim =
        color.family === 'cool' &&
        /blue|navy|indigo/.test(color.name) &&
        color.luminance < 0.62;
      return { kind: denim ? 'jeans' : 'trousers', category: 'bottoms', noun: NOUN[denim ? 'jeans' : 'trousers'], confidence: 0.8 };
    }
    return { kind: 'shorts', category: 'bottoms', noun: NOUN.shorts, confidence: 0.78 };
  }

  if (
    shape.aspect >= 1.05 &&
    shape.aspect < 1.78 &&
    shape.bottomWidth > shape.topWidth * 1.15 &&
    shape.bottomWidth > 0.72 &&
    shape.fill > 0.5
  ) {
    return { kind: 'cap', category: 'caps', noun: NOUN.cap, confidence: 0.6 };
  }

  if (shape.aspect >= 1.78 && shape.lowerWidth > 0.7 && shape.fill > 0.45) {
    return { kind: 'sneaker', category: 'shoes', noun: NOUN.sneaker, confidence: 0.72 };
  }

  if (shape.holeRatio > 0.018 && shape.aspect > 0.4 && shape.aspect < 1.5 && shape.fill > 0.45) {
    return { kind: 'bag', category: 'bags', noun: NOUN.bag, confidence: 0.58 };
  }

  // Slim and tall with no leg split: a narrowed folded piece, but not when the
  // sleeves run the length of it — that is outerwear.
  if (shape.aspect < 0.62 && shape.fill > 0.35 && shape.sleeveReach < 0.55) {
    return { kind: 'trousers', category: 'bottoms', noun: NOUN.trousers, confidence: 0.55 };
  }

  // ---- upper wear ----
  // Sleeve length is measured, not guessed: a short sleeve stops early and the
  // silhouette narrows to the body, a long sleeve runs most of the way down.
  const longSleeve = shape.sleeveReach >= 0.55;
  if (!longSleeve) {
    return { kind: 'tee', category: 'tops', noun: NOUN.tee, confidence: 0.72 };
  }
  // A checked weave crossing in both directions is a flannel; stripes alone are
  // still just stripes.
  if (pattern === 'plaid') {
    return { kind: 'flannel', category: 'tops', noun: NOUN.flannel, confidence: 0.66 };
  }
  // A coat hangs past the hip: much taller than wide, sleeves down to the hem
  // and a hem nearly as wide as the chest — otherwise it is just a slim top.
  if (shape.aspect < 0.7 && shape.bottomWidth >= 0.6 && shape.fill > 0.55) {
    return { kind: 'coat', category: 'jackets', noun: NOUN.coat, confidence: 0.56 };
  }
  // A hood puts bulk above the shoulder line, so the very top of the piece is
  // narrow where a shirt's shoulders are wide.
  if (
    shape.crownWidth < 0.45 &&
    shape.crownDepth > 0.16 &&
    shape.fill > 0.5 &&
    shape.aspect > 0.62 &&
    shape.bottomWidth >= 0.5
  ) {
    return { kind: 'hoodie', category: 'tops', noun: NOUN.hoodie, confidence: 0.58 };
  }
  // Sleeves held out, wider than tall: a long-sleeve tee rather than a shirt.
  if (shape.aspect >= 0.92 && shape.bottomWidth >= 0.45) {
    return { kind: 'tee', category: 'tops', noun: 'long-sleeve tee', confidence: 0.6 };
  }
  return { kind: 'shirt', category: 'tops', noun: NOUN.shirt, confidence: 0.62 };
}

/**
 * Segment one image and describe the largest garment-like shape. The result
 * includes a feathered alpha mask and a crop; encoding is the caller's job.
 */
export function segmentGarment(data: Uint8Array, width: number, height: number): SegmentOutcome {
  if (width < 8 || height < 8 || data.length < width * height * 4) {
    return { ok: false, failure: SEGMENT_FAILURES.unreadable };
  }

  const total = width * height;
  const centers = backgroundCenters(data, width, height);
  const distances = new Uint8Array(total);
  const histogram = new Uint32Array(256);
  const background = new Uint8Array(total);

  for (let index = 0; index < total; index += 1) {
    const dataIndex = index * 4;
    const r = data[dataIndex];
    const g = data[dataIndex + 1];
    const b = data[dataIndex + 2];
    let nearest = Infinity;
    for (const center of centers) {
      nearest = Math.min(nearest, rgbDistance(r, g, b, center));
    }
    const clipped = clamp(Math.round(nearest), 0, 255);
    distances[index] = clipped;
    histogram[clipped] += 1;
  }

  // A garment can contain a dark stripe that Otsu would mistake for background.
  // The border spread is a safer floor; Otsu only prevents over-separation on
  // a very busy surface.
  const spread = borderSpread(data, width, height, centers);
  const threshold = clamp(Math.min(otsuThreshold(histogram, total) + 6, spread * 1.8 + 14), 30, 78);

  for (let index = 0; index < total; index += 1) {
    if (distances[index] < threshold) {
      background[index] = 1;
      continue;
    }

    const dataIndex = index * 4;
    if (isShadowedSurface(data[dataIndex], data[dataIndex + 1], data[dataIndex + 2], centers)) {
      background[index] = 1;
      continue;
    }
    background[index] = 0;
  }

  // Use the colour mask directly. An enclosed patch of surface (a bag handle,
  // a collar opening) is still background and must stay transparent.
  const foreground = new Uint8Array(total);
  let foregroundArea = 0;
  for (let index = 0; index < total; index += 1) {
    if (background[index] === 0) {
      foreground[index] = 1;
      foregroundArea += 1;
    }
  }

  if (foregroundArea < total * 0.003) {
    return { ok: false, failure: SEGMENT_FAILURES['no-garment'] };
  }

  let components = largestComponents(foreground, width, height);
  if (!components) return { ok: false, failure: SEGMENT_FAILURES['no-garment'] };

  // Guard against an inverted mask. An unevenly lit or busy surface (a quilted
  // mattress, a printed sheet beside the piece) can leave the largest
  // "foreground" shape being the surface itself: that is what produced blank
  // cutouts titled with background colours. When the largest shape matches the
  // border colour, flip the mask and drop whatever is welded to the frame.
  const largestMean = componentMeanColor(components.labels, components.largest.label, data, total);
  const largestRelation = surfaceRelation(largestMean[0], largestMean[1], largestMean[2], centers);
  if (largestRelation.distinct < Math.max(14, threshold * 0.6)) {
    const inverted = new Uint8Array(total);
    for (let index = 0; index < total; index += 1) {
      inverted[index] = background[index] === 0 ? 0 : 1;
    }
    const ring = 2;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (x < ring || y < ring || x >= width - ring || y >= height - ring) {
          inverted[y * width + x] = 0;
        }
      }
    }
    const recovered = largestComponents(inverted, width, height);
    if (recovered) components = recovered;
  }

  const selectedLabels = new Set(components.selected.map((component) => component.label));
  let mask: Uint8Array = new Uint8Array(total);
  for (let index = 0; index < total; index += 1) {
    if (selectedLabels.has(components.labels[index])) mask[index] = 1;
  }
  // One pixel of erosion removes the anti-aliased rim that otherwise reads as
  // a dirty halo around the cutout. Feathering restores a soft edge after.
  // One-pixel closing seals pinholes and notches in the silhouette first; the
  // erosion below then removes the anti-aliased rim.
  mask = closeMask(mask, width, height);
  mask = erodeMask(mask, width, height);

  const boundsBeforeFill = trimBounds(
    Uint8Array.from(mask, (value) => (value ? 255 : 0)),
    width,
    height,
  );
  if (!boundsBeforeFill) return { ok: false, failure: SEGMENT_FAILURES['no-garment'] };

  // Count enclosed openings without filling them: a collar gap or the space
  // under a bag handle should stay transparent in the cutout.
  const seen = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const seedEmpty = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (mask[index] === 0 && seen[index] === 0) {
      seen[index] = 1;
      queue[tail] = index;
      tail += 1;
    }
  };
  for (let x = boundsBeforeFill.x; x < boundsBeforeFill.x + boundsBeforeFill.width; x += 1) {
    seedEmpty(x, boundsBeforeFill.y);
    seedEmpty(x, boundsBeforeFill.y + boundsBeforeFill.height - 1);
  }
  for (let y = boundsBeforeFill.y; y < boundsBeforeFill.y + boundsBeforeFill.height; y += 1) {
    seedEmpty(boundsBeforeFill.x, y);
    seedEmpty(boundsBeforeFill.x + boundsBeforeFill.width - 1, y);
  }
  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = (index - x) / width;
    seedEmpty(x - 1, y);
    seedEmpty(x + 1, y);
    seedEmpty(x, y - 1);
    seedEmpty(x, y + 1);
  }

  let holeArea = 0;
  for (let y = boundsBeforeFill.y; y < boundsBeforeFill.y + boundsBeforeFill.height; y += 1) {
    for (let x = boundsBeforeFill.x; x < boundsBeforeFill.x + boundsBeforeFill.width; x += 1) {
      const index = y * width + x;
      if (mask[index] === 0 && seen[index] === 0) holeArea += 1;
    }
  }

  const alpha = Uint8Array.from(mask, (value) => (value ? 255 : 0));
  feather(alpha, width, height);
  const bounds = trimBounds(alpha, width, height);
  if (!bounds) return { ok: false, failure: SEGMENT_FAILURES['no-garment'] };

  const minSide = Math.min(bounds.width, bounds.height);
  if (minSide < Math.max(24, Math.min(width, height) * 0.08)) {
    return { ok: false, failure: SEGMENT_FAILURES['too-small'] };
  }

  // A piece cropped by both sides cannot produce a clean cutout. This catches
  // close-ups that fill the frame with too little surface to work from.
  const touchesHorizontal = bounds.x <= 1 && bounds.x + bounds.width >= width - 1;
  const touchesVertical = bounds.y <= 1 && bounds.y + bounds.height >= height - 1;
  if (touchesHorizontal || touchesVertical) {
    return { ok: false, failure: SEGMENT_FAILURES['no-background'] };
  }

  let area = 0;
  for (let index = 0; index < total; index += 1) {
    if (mask[index] === 1) area += 1;
  }
  // A mask covering nearly the whole photo means no surface was ever found.
  if (area > total * 0.96) {
    return { ok: false, failure: SEGMENT_FAILURES['no-background'] };
  }

  // Last line of defence against swapped roles. When the piece hugs the frame
  // and the surface is only a corner, the border estimate can end up holding
  // the piece and cutting the surface, which is what returned blank cutouts.
  // A large, much brighter interior region that matches no border colour means
  // the roles are inverted: refuse instead of returning the surface.
  const means = boundsMeans(mask, data, width, bounds);
  if (means.gapShare > 0.3) {
    const gapRelation = surfaceRelation(means.gap[0], means.gap[1], means.gap[2], centers);
    const pieceLuma = luma(means.piece[0], means.piece[1], means.piece[2]);
    const gapLuma = luma(means.gap[0], means.gap[1], means.gap[2]);
    if (gapRelation.distinct > 60 && gapLuma > pieceLuma + 40) {
      return { ok: false, failure: SEGMENT_FAILURES['no-background'] };
    }
  }

  // A "piece" whose colour is the surface colour is the surface: refuse instead
  // of returning a cutout of the table, titled with the table's own colour.
  if (surfaceRelation(means.piece[0], means.piece[1], means.piece[2], centers).distinct < Math.max(18, threshold * 0.8)) {
    return { ok: false, failure: SEGMENT_FAILURES['no-garment'] };
  }
  const shape = shapeMetrics(alpha, width, height, bounds, area, holeArea);
  const color = dominantColor(data, alpha, width, bounds, centers, threshold);
  const pattern = fabricPattern(data, alpha, width, bounds);
  const guess = classify(shape, color, pattern);

  let distanceSum = 0;
  for (let index = 0; index < total; index += 1) {
    if (mask[index] === 1) distanceSum += distances[index];
  }
  const averageContrast = area > 0 ? distanceSum / area : 0;
  const contrastScore = clamp((averageContrast - threshold) / 90, 0, 1);
  const fillScore = 1 - Math.min(1, Math.abs(shape.fill - 0.55) / 0.55);
  const confidence = clamp(
    0.4 + contrastScore * 0.32 + fillScore * 0.18 + guess.confidence * 0.16 - shape.edgeContact * 0.18,
    0.25,
    0.98,
  );

  const name = `${pattern ? 'striped ' : ''}${color.name} ${guess.noun}`;

  return {
    ok: true,
    segmentation: {
      alpha,
      bounds,
      shape,
      color,
      pattern,
      kind: guess.kind,
      category: guess.category,
      noun: guess.noun,
      name,
      confidence,
    },
  };
}

/**
 * Put the cutout on a transparent square canvas with generous breathing room,
 * scaled with bilinear sampling. Transparent source pixels are premultiplied so
 * no background colour bleeds into the feathered edge.
 */
export function composeCutoutSquare(
  data: Uint8Array,
  width: number,
  height: number,
  alpha: Uint8Array,
  bounds: Bounds,
  size = 420,
): Uint8Array {
  const output = new Uint8Array(size * size * 4);
  const inner = size * 0.84;
  const scale = Math.min(inner / bounds.width, inner / bounds.height);
  const drawWidth = Math.max(1, Math.floor(bounds.width * scale));
  const drawHeight = Math.max(1, Math.floor(bounds.height * scale));
  const offsetX = Math.floor((size - drawWidth) / 2);
  const offsetY = Math.floor((size - drawHeight) / 2);

  const sample = (x: number, y: number) => {
    const sx = clamp(x, 0, width - 1);
    const sy = clamp(y, 0, height - 1);
    const index = sy * width + sx;
    return {
      a: alpha[index] / 255,
      r: data[index * 4],
      g: data[index * 4 + 1],
      b: data[index * 4 + 2],
    };
  };

  for (let dy = 0; dy < drawHeight; dy += 1) {
    for (let dx = 0; dx < drawWidth; dx += 1) {
      const fx = bounds.x + ((dx + 0.5) / drawWidth) * bounds.width - 0.5;
      const fy = bounds.y + ((dy + 0.5) / drawHeight) * bounds.height - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const topLeft = sample(x0, y0);
      const topRight = sample(x0 + 1, y0);
      const bottomLeft = sample(x0, y0 + 1);
      const bottomRight = sample(x0 + 1, y0 + 1);
      const weights = [
        [topLeft, (1 - tx) * (1 - ty)],
        [topRight, tx * (1 - ty)],
        [bottomLeft, (1 - tx) * ty],
        [bottomRight, tx * ty],
      ] as const;
      let outAlpha = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (const [pixel, weight] of weights) {
        const wa = pixel.a * weight;
        outAlpha += wa;
        r += pixel.r * wa;
        g += pixel.g * wa;
        b += pixel.b * wa;
      }
      if (outAlpha <= 0.002) continue;
      const out = ((offsetY + dy) * size + offsetX + dx) * 4;
      output[out] = clamp(Math.round(r / outAlpha), 0, 255);
      output[out + 1] = clamp(Math.round(g / outAlpha), 0, 255);
      output[out + 2] = clamp(Math.round(b / outAlpha), 0, 255);
      output[out + 3] = clamp(Math.round(outAlpha * 255), 0, 255);
    }
  }
  return output;
}

/**
 * Crop the uploaded photo to the piece, keeping a slight border of its surface.
 * The pixels stay photographic — nothing is thresholded away — so a pale or
 * dark garment can never turn into a blank white square.
 */
export function composePhotoCutout(
  data: Uint8Array,
  width: number,
  height: number,
  bounds: Bounds,
  size = 420,
): Uint8Array {
  const output = new Uint8Array(size * size * 4);
  const pad = Math.max(4, Math.round(Math.min(width, height) * 0.045));
  const left = clamp(bounds.x - pad, 0, width - 1);
  const top = clamp(bounds.y - pad, 0, height - 1);
  const right = clamp(bounds.x + bounds.width + pad, left + 1, width);
  const bottom = clamp(bounds.y + bounds.height + pad, top + 1, height);
  const cropWidth = right - left;
  const cropHeight = bottom - top;

  const inner = size * 0.92;
  const scale = Math.min(inner / cropWidth, inner / cropHeight);
  const drawWidth = Math.max(1, Math.floor(cropWidth * scale));
  const drawHeight = Math.max(1, Math.floor(cropHeight * scale));
  const offsetX = Math.floor((size - drawWidth) / 2);
  const offsetY = Math.floor((size - drawHeight) / 2);

  const sample = (x: number, y: number): Rgb => {
    const sx = clamp(x, 0, width - 1);
    const sy = clamp(y, 0, height - 1);
    const index = (sy * width + sx) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  };

  for (let dy = 0; dy < drawHeight; dy += 1) {
    for (let dx = 0; dx < drawWidth; dx += 1) {
      const fx = left + ((dx + 0.5) / drawWidth) * cropWidth - 0.5;
      const fy = top + ((dy + 0.5) / drawHeight) * cropHeight - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const corners: Rgb[] = [sample(x0, y0), sample(x0 + 1, y0), sample(x0, y0 + 1), sample(x0 + 1, y0 + 1)];
      const weights = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
      let r = 0;
      let g = 0;
      let b = 0;
      for (let corner = 0; corner < 4; corner += 1) {
        r += corners[corner][0] * weights[corner];
        g += corners[corner][1] * weights[corner];
        b += corners[corner][2] * weights[corner];
      }
      const out = ((offsetY + dy) * size + offsetX + dx) * 4;
      output[out] = clamp(Math.round(r), 0, 255);
      output[out + 1] = clamp(Math.round(g), 0, 255);
      output[out + 2] = clamp(Math.round(b), 0, 255);
      output[out + 3] = 255;
    }
  }
  return output;
}

export function describeCutout(segmentation: Segmentation): string {
  const { color, noun, pattern } = segmentation;
  const shapePhrase =
    noun === 'sneakers'
      ? 'a pair of sneakers'
      : /s$/.test(noun)
        ? noun
        : `a ${noun}`;
  const patternPhrase = pattern === 'plaid' ? 'the check' : pattern === 'striped' ? 'the stripe' : 'the colour';
  return `cut from your photo on this device. ${patternPhrase} reads as ${color.name}; the shape reads as ${shapePhrase}.`;
}
