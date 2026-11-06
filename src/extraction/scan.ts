import { Garment } from '../types';

/**
 * Shared scan helpers.
 *
 * The demo path uses the deterministic rack. The real-photo path uses the
 * local cutout pipeline in `extraction/cutout.ts`; this module keeps the stage
 * labels and duplicate checks used by both paths.
 */

export type DetectionSet = {
  items: Garment[];
  duplicatesRemoved: number;
  demo: boolean;
  source: 'demo-rack' | 'photos';
};

export const SCAN_STAGES = [
  { at: 0, label: 'opening the rack' },
  { at: 0.12, label: 'reading garment edges' },
  { at: 0.32, label: 'separating pieces' },
  { at: 0.52, label: 'matching colour and fabric' },
  { at: 0.72, label: 'checking for repeats' },
  { at: 0.9, label: 'hanging everything up' },
] as const;

export function scanStageLabel(progress: number): string {
  let label: string = SCAN_STAGES[0].label;
  for (const stage of SCAN_STAGES) {
    if (progress >= stage.at) label = stage.label;
  }
  return label;
}

/** Stable signature used to spot the same piece twice. */
export function garmentSignature(garment: Pick<Garment, 'kind' | 'colorName' | 'name'>): string {
  return `${garment.kind}|${garment.colorName}|${garment.name}`.toLowerCase();
}

export function dedupeDetections(items: Garment[]): { kept: Garment[]; removed: Garment[] } {
  const seen = new Set<string>();
  const kept: Garment[] = [];
  const removed: Garment[] = [];
  items.forEach((item) => {
    const signature = garmentSignature(item);
    if (seen.has(signature)) {
      removed.push(item);
      return;
    }
    seen.add(signature);
    kept.push(item);
  });
  return { kept, removed };
}

/**
 * The demo rack is returned exactly as seeded: deterministic for presentations,
 * flagged as demo on every piece, and never described as camera-roll analysis.
 */
export function demoDetectionSet(catalog: Garment[]): DetectionSet {
  const { kept, removed } = dedupeDetections(catalog);
  return {
    items: kept.map((garment) => ({ ...garment, demo: true })),
    duplicatesRemoved: removed.length,
    demo: true,
    source: 'demo-rack',
  };
}

export type ScanSummary = {
  total: number;
  demo: boolean;
  byCategory: Record<string, number>;
};

export function summariseDetections(items: Garment[], demo = items.every((item) => item.demo)): ScanSummary {
  const byCategory: Record<string, number> = {};
  items.forEach((item) => {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  });
  return { total: items.length, demo, byCategory };
}
