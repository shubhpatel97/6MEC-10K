declare module 'upng-js' {
  export type UPNGImage = {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    data: Uint8Array;
  };

  const UPNG: {
    decode(buffer: ArrayBuffer | Uint8Array): UPNGImage;
    toRGBA8(image: UPNGImage): ArrayBuffer[];
    encode(buffers: ArrayBuffer[], width: number, height: number, colors?: number): ArrayBuffer;
  };

  export default UPNG;
}
