import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

/**
 * The crest app icon: a black square with a tightly spaced white lowercase
 * crest wordmark. Geometry matches src/brand/wordmark.ts.
 */
const GEOMETRY = {
  width: 160,
  height: 64,
  strokeWidth: 6.4,
  paths: [
    'M38 24 C34 19.5 28.5 17.5 23 17.5 C13 17.5 7 25 7 36 C7 47 13 54.5 23 54.5 C29 54.5 34.5 52 38 47.5',
    'M47 54.5 L47 25 M47 33 C50 27.5 55.5 24.5 63 25.5',
    'M69 40.5 L94.5 40.5 C94.5 29.5 88.5 23.5 80.5 23.5 C71 23.5 66.5 31.5 66.5 39 C66.5 48.5 72.5 55 81 55 C86.5 55 91 52.5 94 48.5',
    'M124 27 C119 23 112.5 22.5 107 25 C101 27.8 101.5 35 108 37.5 L115.5 40 C122.5 42.5 122.5 51 116 54 C110 56.8 103.5 54.8 100 50.5',
    'M140 14 L140 47.5 C140 52.5 143.5 55 149 53.5 M131 27.5 L150.5 27.5',
  ],
};

function wordmarkSvg({ color = '#ffffff', background = null, width, height, markWidth }) {
  const scale = markWidth / GEOMETRY.width;
  const x = (width - markWidth) / 2;
  const y = (height - GEOMETRY.height * scale) / 2;
  const paths = GEOMETRY.paths
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${GEOMETRY.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${background ? `<rect width="${width}" height="${height}" fill="${background}"/>` : ''}
    <g transform="translate(${x} ${y}) scale(${scale})">${paths}</g>
  </svg>`;
}

async function write(name, svg) {
  await sharp(Buffer.from(svg)).png().toFile(`assets/${name}`);
  console.log(`assets/${name}`);
}

await mkdir('assets', { recursive: true });

await write(
  'icon.png',
  wordmarkSvg({ color: '#ffffff', background: '#0b0b0b', width: 1024, height: 1024, markWidth: 680 }),
);
await write(
  'adaptive-icon.png',
  wordmarkSvg({ color: '#ffffff', width: 1024, height: 1024, markWidth: 560 }),
);
await write(
  'monochrome-icon.png',
  wordmarkSvg({ color: '#ffffff', width: 1024, height: 1024, markWidth: 560 }),
);
await write(
  'splash-icon.png',
  wordmarkSvg({ color: '#ffffff', width: 512, height: 512, markWidth: 330 }),
);
await write(
  'favicon.png',
  wordmarkSvg({ color: '#ffffff', background: '#0b0b0b', width: 64, height: 64, markWidth: 48 }),
);

console.log('done');
