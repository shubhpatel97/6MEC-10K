import { Category, GarmentKind } from '../types';
import { composeCutoutSquare, describeCutout, segmentGarment, SEGMENT_FAILURES } from './segment';
import { encodeCutout, encodeSourcePhoto, prepareImage } from './imagePipeline';

export type CutoutStage = 'reading' | 'separating' | 'trimming' | 'naming';

export const CUTOUT_STAGE_LABEL: Record<CutoutStage, string> = {
  reading: 'reading the photo',
  separating: 'lifting the garment from its background',
  trimming: 'trimming the cutout',
  naming: 'reading colour and shape',
};

export type ExtractedPiece = {
  name: string;
  kind: GarmentKind;
  category: Category;
  colorName: string;
  color: string;
  accent: string;
  colorFamily: 'neutral' | 'earth' | 'cool' | 'warm';
  description: string;
  cutoutUri: string;
  sourcePhotoUri: string | null;
  confidence: number;
  warning: string | null;
};

export type CutoutFailure = {
  code: 'no-garment' | 'no-background' | 'too-small' | 'unreadable';
  message: string;
  photoUri: string;
};

export type CutoutResult =
  | { ok: true; piece: ExtractedPiece }
  | { ok: false; failure: CutoutFailure };

const CUTOUT_SIZE = 420;

/**
 * Convert one uploaded photo into a transparent, titled garment cutout.
 * Everything happens on-device; the callback exists so the scan screen can
 * narrate real stages instead of a decorative timer.
 */
export async function extractCutout(
  uri: string,
  options: { onStage?: (stage: CutoutStage) => void } = {},
): Promise<CutoutResult> {
  const report = (stage: CutoutStage) => options.onStage?.(stage);

  try {
    report('reading');
    const image = await prepareImage(uri);

    report('separating');
    const outcome = segmentGarment(image.data, image.width, image.height);
    if (!outcome.ok) {
      return {
        ok: false,
        failure: {
          code: outcome.failure.code,
          message: outcome.failure.message,
          photoUri: uri,
        },
      };
    }

    report('trimming');
    // The cutout is the photographed piece itself: its own pixels, shaped by the
    // mask, on a transparent square. Nothing is redrawn or retinted, and the
    // surface, shadows and stray objects around the piece are what get deleted.
    const square = composeCutoutSquare(
      image.data,
      image.width,
      image.height,
      outcome.segmentation.alpha,
      outcome.segmentation.bounds,
      CUTOUT_SIZE,
    );
    const cutoutUri = await encodeCutout(square, CUTOUT_SIZE);

    report('naming');
    const segmentation = outcome.segmentation;
    let sourcePhotoUri: string | null = null;
    try {
      sourcePhotoUri = await encodeSourcePhoto(uri);
    } catch {
      // The cutout is still useful even if the reference photo cannot be kept.
      sourcePhotoUri = null;
    }

    return {
      ok: true,
      piece: {
        name: segmentation.name,
        kind: segmentation.kind,
        category: segmentation.category,
        colorName: segmentation.color.name,
        color: segmentation.color.hex,
        accent: segmentation.color.accent,
        colorFamily: segmentation.color.family,
        description: describeCutout(segmentation),
        cutoutUri,
        sourcePhotoUri,
        confidence: segmentation.confidence,
        warning:
          segmentation.confidence < 0.5
            ? 'the photo was low contrast. the cutout may need a cleaner surface.'
            : null,
      },
    };
  } catch {
    return {
      ok: false,
      failure: {
        code: 'unreadable',
        message: SEGMENT_FAILURES.unreadable.message,
        photoUri: uri,
      },
    };
  }
}
