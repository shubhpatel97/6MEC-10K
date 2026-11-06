/**
 * The crest wordmark.
 *
 * The original crest logo file did not exist in this repository, so the mark is
 * rebuilt as tight lowercase stroke letterforms. It is intentionally geometric:
 * drawn paths can animate, fill with ink and rasterise into the app icon.
 */

export type WordmarkLetter = {
  char: string;
  /** muted studio colour used while the stroke is drawn */
  tint: string;
  path: string;
};

export const WORDMARK = {
  width: 160,
  height: 64,
  strokeWidth: 6.4,
  letters: [
    {
      char: 'c',
      tint: '#a9745a',
      path: 'M38 24 C34 19.5 28.5 17.5 23 17.5 C13 17.5 7 25 7 36 C7 47 13 54.5 23 54.5 C29 54.5 34.5 52 38 47.5',
    },
    {
      char: 'r',
      tint: '#6f7251',
      path: 'M47 54.5 L47 25 M47 33 C50 27.5 55.5 24.5 63 25.5',
    },
    {
      char: 'e',
      tint: '#54677a',
      path: 'M69 40.5 L94.5 40.5 C94.5 29.5 88.5 23.5 80.5 23.5 C71 23.5 66.5 31.5 66.5 39 C66.5 48.5 72.5 55 81 55 C86.5 55 91 52.5 94 48.5',
    },
    {
      char: 's',
      tint: '#b08a3e',
      path: 'M124 27 C119 23 112.5 22.5 107 25 C101 27.8 101.5 35 108 37.5 L115.5 40 C122.5 42.5 122.5 51 116 54 C110 56.8 103.5 54.8 100 50.5',
    },
    {
      char: 't',
      tint: '#7b7469',
      path: 'M140 14 L140 47.5 C140 52.5 143.5 55 149 53.5 M131 27.5 L150.5 27.5',
    },
  ] satisfies WordmarkLetter[],
} as const;

/** Wordmark as a standalone SVG string, used by scripts/make-assets.mjs. */
export function wordmarkSvg(options: {
  color: string;
  background?: string;
  width: number;
  height: number;
  padding?: number;
}): string {
  const { color, background, width, height, padding = 0 } = options;
  const contentWidth = width - padding * 2;
  const contentHeight = height - padding * 2;
  const scale = Math.min(contentWidth / WORDMARK.width, contentHeight / WORDMARK.height);
  const offsetX = (width - WORDMARK.width * scale) / 2;
  const offsetY = (height - WORDMARK.height * scale) / 2;
  const paths = WORDMARK.letters.map(
    (letter) =>
      `<path d="${letter.path}" fill="none" stroke="${color}" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    background ? `<rect width="${width}" height="${height}" fill="${background}"/>` : '',
    `<g transform="translate(${offsetX} ${offsetY}) scale(${scale})">${paths.join('')}</g>`,
    '</svg>',
  ].join('');
}
