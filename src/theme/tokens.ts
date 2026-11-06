/**
 * crest design tokens.
 *
 * Rules of the house:
 * - black is for stylist, you and onboarding
 * - paper is for closet and garment details
 * - garments supply the colour; chrome stays quiet
 * - commerce surfaces (buttons, tiles, progress) are sharp edged
 * - rounding is reserved for chat: bubbles, chips, inputs, look cards
 */

export const palette = {
  ink: '#0b0b0b',
  inkRaised: '#151515',
  inkLine: '#282826',
  inkSoft: '#3a3a37',
  paper: '#f2efe8',
  paperRaised: '#faf8f3',
  paperDeep: '#e8e3d9',
  paperLine: '#d9d3c6',
  white: '#ffffff',
  muted: '#8f897e',
  mutedInk: '#6a655c',
  mutedOnInk: '#9b968c',
  never: '#b02a1f',
  demo: '#8a8478',
  positive: '#4f6448',
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Sharp surfaces. Only chat rounds. */
export const radius = {
  sharp: 0,
  chatBubble: 16,
  chatInput: 22,
  chatCard: 14,
  chip: 999,
} as const;

export const layout = {
  readingWidth: 620,
  closetWidth: 980,
  tabBarHeight: 56,
  touch: 48,
} as const;

export const hairline = 1;

export const durations = {
  fast: 160,
  base: 260,
  slow: 520,
  introDraw: 1400,
} as const;

export const categoryOrder = ['tops', 'bottoms', 'jackets', 'shoes', 'caps', 'bags'] as const;

export type Category = (typeof categoryOrder)[number];

export const categoryLabel = {
  all: 'all',
  tops: 'tops',
  bottoms: 'bottoms',
  jackets: 'jackets',
  shoes: 'shoes',
  caps: 'caps',
  bags: 'bags',
} as const;
