/**
 * Web image pipeline.
 *
 * A browser canvas is already a high-quality decoder/encoder, so the web path
 * uses it directly. The native sibling implements the same contract with
 * expo-image-manipulator and a small PNG codec.
 */

export type PreparedImage = {
  data: Uint8Array;
  width: number;
  height: number;
};

const WORKING_MAX = 900;

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image load failed'));
    image.src = uri;
  });
}

export async function prepareImage(uri: string): Promise<PreparedImage> {
  const image = await loadImage(uri);
  const scale = Math.min(1, WORKING_MAX / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('canvas unavailable');
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  return { data: new Uint8Array(pixels.data), width, height };
}

export async function encodeCutout(data: Uint8Array, size: number): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');
  const imageData = context.createImageData(size, size);
  imageData.data.set(data);
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function encodeSourcePhoto(uri: string, max = 720): Promise<string> {
  const image = await loadImage(uri);
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');
  context.fillStyle = '#f2efe8';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.62);
}
