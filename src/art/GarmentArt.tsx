import React from 'react';
import { G, Path, Rect, Circle, Svg } from 'react-native-svg';
import { GarmentKind } from '../types';

export type GarmentArtProps = {
  kind: GarmentKind;
  color: string;
  accent: string;
  width: number;
  height: number;
};

/** Decide a detail-line colour that reads on both light and dark garments. */
export function detailColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 'rgba(0,0,0,0.22)';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.24)';
}

/**
 * Clean vector cutouts: garment only, transparent ground, no body, no box.
 * These are demo assets — the real photo extractor is a separate integration.
 */
export function GarmentArt({ kind, color, accent, width, height }: GarmentArtProps) {
  const detail = detailColor(color);

  return (
    <Svg width={width} height={height} viewBox="0 0 100 120" fill="none">
      {renderGarment(kind, color, accent, detail)}
    </Svg>
  );
}

function renderGarment(kind: GarmentKind, color: string, accent: string, detail: string) {
  switch (kind) {
    case 'tee':
      return (
        <G>
          <Path
            d="M32 21 20 19 7 43l13 10 9-6v61c13 3 29 3 42 0V47l9 6 13-10L80 19l-12 2c-7 7-22 7-29 0Z"
            fill={color}
          />
          <Path d="M40 21.5c2.5 7 17.5 7 20 0" stroke={detail} strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M29 100h42" stroke={detail} strokeWidth={1.1} />
        </G>
      );
    case 'shirt':
      return (
        <G>
          <Path
            d="M32 21 20 19 7 44l13 9 9-6v62c13 3 29 3 42 0V47l9 6 13-9L80 19l-12 2-9 11-9-11-9 11-9-11Z"
            fill={color}
          />
          <Path d="M38 21 49 32v14L40 34Z" fill={accent} />
          <Path d="M62 21 51 32v14l9-12Z" fill={accent} />
          <Path d="M50 32v74" stroke={detail} strokeWidth={1.2} />
          {[43, 57, 71, 85].map((y) => (
            <Circle key={y} cx={50} cy={y} r={1.5} fill={detail} />
          ))}
          <Path d="M29 100h42" stroke={detail} strokeWidth={1.1} />
        </G>
      );
    case 'knit':
      return (
        <G>
          <Path
            d="M31 22 18 24 5 47l13 9 9-5v50c15 3 31 3 46 0V51l9 5 13-9L82 24 69 22 60 28c-6 4-14 4-20 0Z"
            fill={color}
          />
          <Path d="M40 23c2 6 18 6 20 0" stroke={detail} strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M8 47l11 7M92 47l-11 7" stroke={detail} strokeWidth={1.4} />
          <Path d="M28 100h44v10H28Z" fill={accent} />
          {[33, 41, 49, 57, 65].map((y) => (
            <Path key={y} d={`M30 ${y}h40`} stroke={detail} strokeWidth={1} />
          ))}
        </G>
      );
    case 'hoodie':
      return (
        <G>
          <Path
            d="M31 27 18 26 5 50l13 10 9-5v57c13 3 29 3 42 0V55l9 5 13-10L82 26 69 27 60 33c-6 4-14 4-20 0Z"
            fill={color}
          />
          <Path d="M38 27c2-13 22-13 24 0-3 10-21 10-24 0Z" fill={accent} />
          <Path d="M40 15c4 3 16 3 20 0" stroke={detail} strokeWidth={1.2} strokeLinecap="round" />
          <Path d="M44 33v13M56 33v13" stroke={detail} strokeWidth={1.4} strokeLinecap="round" />
          <Circle cx={44} cy={47} r={1.6} fill={detail} />
          <Circle cx={56} cy={47} r={1.6} fill={detail} />
          <Path d="M37 80h26v15H37Z" fill={accent} opacity={0.75} />
          <Path d="M28 100h44v10H28Z" fill={accent} />
        </G>
      );
    case 'flannel':
      return (
        <G>
          <Path
            d="M32 21 20 19 7 44l13 9 9-6v62c13 3 29 3 42 0V47l9 6 13-9L80 19l-12 2-9 11-9-11-9 11-9-11Z"
            fill={color}
          />
          <Path d="M38 21 49 32v14L40 34Z" fill={accent} />
          <Path d="M62 21 51 32v14l9-12Z" fill={accent} />
          {[34, 46, 58, 70, 82, 94].map((y) => (
            <Path key={`h${y}`} d={`M26 ${y}h48`} stroke={detail} strokeWidth={1.4} opacity={0.55} />
          ))}
          {[33, 50, 67].map((x) => (
            <Path key={`v${x}`} d={`M${x} 24v80`} stroke={detail} strokeWidth={1.4} opacity={0.55} />
          ))}
          <Path d="M50 32v74" stroke={detail} strokeWidth={1.2} />
          {[43, 57, 71, 85].map((y) => (
            <Circle key={y} cx={50} cy={y} r={1.4} fill={detail} />
          ))}
        </G>
      );
    case 'jacket':
      return (
        <G>
          <Path
            d="M31 21 18 24 5 47l13 10 9-5v53h20V41l-6-8v-6l-4 34c-4-13-4-27 0-40Z"
            fill={color}
          />
          <Path d="M69 21 82 24 95 47 82 57l-9-5v53H53V41l6-8V27l4 34c4-13 4-27 0-40Z" fill={color} />
          <Path d="M38 21h24l-6 20h-12Z" fill={accent} />
          <Path d="M42 29h16" stroke={detail} strokeWidth={1.2} />
          <Path d="M50 43v67" stroke={accent} strokeWidth={2.4} />
          <Path d="M50 45v30M50 84v26" stroke={detail} strokeWidth={1} strokeDasharray="2 2" />
          <Path d="M20 71h10M70 71h10" stroke={detail} strokeWidth={1.2} />
        </G>
      );
    case 'coat':
      return (
        <G>
          <Path d="M31 20 19 23 7 50l11 9 9-4v60h22V43l-5-9-2-10-5 40c-3-14-3-26 0-34Z" fill={color} />
          <Path d="M69 20 81 23 93 50 82 59l-9-4v60H51V43l5-9 2-10 5 40c3-14 3-26 0-34Z" fill={color} />
          <Path d="M39 20h22l-5 23H44Z" fill={accent} />
          <Path d="M50 44v71" stroke={detail} strokeWidth={1.1} />
          <Path d="M27 76h46v5H27Z" fill={accent} opacity={0.85} />
          <Circle cx={44} cy={78.5} r={2} fill={detail} />
          <Circle cx={58} cy={78.5} r={2} fill={detail} />
        </G>
      );
    case 'trousers':
      // Tailored: straight leg, pressed crease, turned cuff, flat front.
      return (
        <G>
          <Path d="M31 14h38l2 18-3 62-1 14H54l-1-12-3-42-3 42-1 12H32l-1-14-3-62Z" fill={color} />
          <Path d="M31 14h38v9H31Z" fill={accent} />
          <Path d="M50 23v25" stroke={detail} strokeWidth={1.1} />
          <Path d="M42 25c3 4 4 9 3 15M58 25c-3 4-4 9-3 15" stroke={detail} strokeWidth={1} opacity={0.7} />
          <Path d="M33 96h13v10H33ZM54 96h13v10H54Z" fill={accent} />
          <Path d="M40 34v52M60 34v52" stroke={detail} strokeWidth={1} opacity={0.8} />
          <Path d="M36 104h10M54 104h10" stroke={detail} strokeWidth={1.1} />
        </G>
      );
    case 'jeans':
      // Denim: five-pocket, rivets, stitched seams, tapered leg, raw hem.
      return (
        <G>
          <Path d="M31 14h38l3 17-5 63-2 12H55l-2-10-3-36-3 36-2 10H35l-2-12-5-63Z" fill={color} />
          <Path d="M31 14h38v8H31Z" fill={accent} />
          <Path d="M35 22c5 3 7 7 7 12M65 22c-5 3-7 7-7 12" stroke={detail} strokeWidth={1.1} />
          <Path d="M50 22v18" stroke={detail} strokeWidth={1} />
          <Circle cx={37} cy={34} r={1.6} fill={detail} />
          <Circle cx={63} cy={34} r={1.6} fill={detail} />
          <Path d="M36 92h12M53 92h11" stroke={detail} strokeWidth={1} strokeDasharray="3 2" />
          <Path d="M50 40v48" stroke={detail} strokeWidth={0.9} strokeDasharray="2 3" opacity={0.6} />
        </G>
      );
    case 'shorts':
      return (
        <G>
          <Path d="M31 20h38l2 12-3 36H53l-3-22-3 22H32l-3-36Z" fill={color} />
          <Path d="M31 24h38v7H31Z" fill={accent} />
          <Path d="M50 31v13" stroke={detail} strokeWidth={1.1} />
          <Path d="M38 34v22M62 34v22" stroke={detail} strokeWidth={1} opacity={0.7} />
          <Path d="M32 62h15M53 62h15" stroke={detail} strokeWidth={1.1} />
        </G>
      );
    case 'sneaker':
      return (
        <G>
          <Path
            d="M8 84c1-10 4-17 12-19 7-2 11 3 17 8l22 12c10 3 15 6 15 12v5H8Z"
            fill={color}
          />
          <Path d="M22 66c3 6 8 10 15 13" stroke={detail} strokeWidth={1.4} />
          <Path d="M30 74c3 5 7 8 12 10" stroke={detail} strokeWidth={1.4} />
          <Path d="M7 97h67c0 6-3 9-9 9H16c-6 0-9-3-9-9Z" fill={accent} />
          <Path d="M51 80c7-6 14-7 20-3 7 4 9 10 9 16" stroke={detail} strokeWidth={1.3} />
          <Path d="M10 102h64" stroke={detail} strokeWidth={1} opacity={0.6} />
        </G>
      );
    case 'boot':
      return (
        <G>
          <Path
            d="M32 20h25l1 32 6 18 20 6c5 2 8 5 8 10v8H16v-8c0-5 3-8 8-10l7-4 1-20Z"
            fill={color}
          />
          <Path d="M32 20h25v7H32Z" fill={accent} />
          <Path d="M39 31c5 1 10 1 15 0M39 39c5 1 10 1 15 0M41 47c4 1 8 1 12 0" stroke={detail} strokeWidth={1.4} strokeLinecap="round" />
          <Path d="M15 96h76v7c0 4-3 6-7 6H22c-4 0-7-2-7-6Z" fill={accent} />
          <Path d="M45 62h20" stroke={detail} strokeWidth={1.2} />
        </G>
      );
    case 'loafer':
      return (
        <G>
          <Path
            d="M12 91c1-9 8-14 18-13l20 3c9 1 17-1 24 1 8 2 13 7 13 14v6H12Z"
            fill={color}
          />
          <Path d="M40 81c8 3 16 3 24 1" stroke={detail} strokeWidth={1.4} />
          <Path d="M52 82h18l-2 12H54Z" fill={accent} />
          <Path d="M12 96h74v6c0 4-3 6-7 6H19c-4 0-7-2-7-6Z" fill={accent} />
          <Path d="M20 90c4-4 9-5 15-4" stroke={detail} strokeWidth={1.2} />
        </G>
      );
    case 'cap':
      return (
        <G>
          <Path d="M23 64c0-21 11-33 27-33s27 12 27 33Z" fill={color} />
          <Path d="M23 64h54c9 0 16 5 17 12H23Z" fill={accent} />
          <Path d="M50 31v33" stroke={detail} strokeWidth={1.3} />
          <Path d="M50 32c-9 0-17 8-20 20M50 32c9 0 17 8 20 20" stroke={detail} strokeWidth={1.2} />
          <Circle cx={50} cy={31} r={2.2} fill={accent} />
          <Path d="M25 74h48" stroke={detail} strokeWidth={1} opacity={0.7} />
        </G>
      );
    case 'bag':
      return (
        <G>
          <Path d="M26 45h48l7 65H19Z" fill={color} />
          <Path d="M36 45c0-15 6-23 14-23s14 8 14 23" stroke={detail} strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <Path d="M19 97h62v13H19Z" fill={accent} />
          <Path d="M38 66h24v18H38Z" stroke={detail} strokeWidth={1.2} fill="none" />
          <Path d="M44 45h12" stroke={detail} strokeWidth={2.2} />
        </G>
      );
    default:
      return <Rect x={20} y={20} width={60} height={80} fill={color} />;
  }
}

/** Small monochrome studio tile used by the splash columns. */
export function StudioPiece({
  kind,
  width,
  height,
  tone,
}: {
  kind: GarmentKind;
  width: number;
  height: number;
  tone: number;
}) {
  const color = ['#7f786c', '#6b6459', '#565148', '#928a7c'][tone % 4];
  const accent = ['#a59c8c', '#958c7e', '#80786c', '#b3aa9b'][tone % 4];
  return <GarmentArt kind={kind} color={color} accent={accent} width={width} height={height} />;
}
