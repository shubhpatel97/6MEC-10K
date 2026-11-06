/**
 * Native image pipeline.
 *
 * Expo ImageManipulator decodes and resizes off the JS thread; the resulting
 * PNG is decoded to raw RGBA with UPNG, segmented in shared JS, then encoded
 * back to a transparent PNG data URI. This keeps the cutout path fully local
 * and avoids a native background-removal module that Expo Go cannot load.
 */

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import UPNG from 'upng-js';
import { fromByteArray, toByteArray } from 'base64-js';

export type PreparedImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

const WORKING_MAX = 900;

async function pngBase64(uri: string, maxWidth: number, maxHeight: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri, { maxWidth, maxHeight });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.PNG, base64: true, compress: 1 });
  context.release();
  image.release();
  if (!result.base64) throw new Error('image encoding failed');
  return result.base64;
}

export async function prepareImage(uri: string): Promise<PreparedImage> {
  const base64 = await pngBase64(uri, WORKING_MAX, WORKING_MAX);
  const bytes = toByteArray(base64);
  const decoded = UPNG.decode(bytes.buffer as ArrayBuffer);
  const frames = UPNG.toRGBA8(decoded);
  if (!frames[0]) throw new Error('image decode failed');
  return {
    data: new Uint8Array(frames[0]),
    width: decoded.width,
    height: decoded.height,
  };
}

export async function encodeCutout(data: Uint8Array, size: number): Promise<string> {
  const encoded = UPNG.encode([data.buffer as ArrayBuffer], size, size, 0);
  return `data:image/png;base64,${fromByteArray(new Uint8Array(encoded))}`;
}

export async function encodeSourcePhoto(uri: string, max = 720): Promise<string> {
  const context = ImageManipulator.manipulate(uri, { maxWidth: max, maxHeight: max });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, base64: true, compress: 0.62 });
  context.release();
  image.release();
  if (!result.base64) throw new Error('image encoding failed');
  return `data:image/jpeg;base64,${result.base64}`;
}
