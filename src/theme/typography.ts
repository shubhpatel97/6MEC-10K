import { Platform, TextStyle } from 'react-native';

/**
 * Helvetica Neue wherever the platform has it, a neutral grotesque elsewhere.
 * No serif, ever. No oversized display type.
 */
export const fontFamily = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  web: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  default: 'System',
});

export const display = {
  fontFamily,
  fontSize: 30,
  lineHeight: 32,
  letterSpacing: -1.15,
  fontWeight: '500',
} satisfies TextStyle;

export const displaySmall = {
  fontFamily,
  fontSize: 24,
  lineHeight: 27,
  letterSpacing: -0.8,
  fontWeight: '500',
} satisfies TextStyle;

export const title = {
  fontFamily,
  fontSize: 19,
  lineHeight: 23,
  letterSpacing: -0.45,
  fontWeight: '500',
} satisfies TextStyle;

export const body = {
  fontFamily,
  fontSize: 15,
  lineHeight: 21,
  letterSpacing: -0.12,
  fontWeight: '400',
} satisfies TextStyle;

export const bodyStrong = {
  ...body,
  fontWeight: '500',
} satisfies TextStyle;

export const small = {
  fontFamily,
  fontSize: 12.5,
  lineHeight: 17,
  letterSpacing: -0.05,
  fontWeight: '400',
} satisfies TextStyle;

export const micro = {
  fontFamily,
  fontSize: 10.5,
  lineHeight: 14,
  letterSpacing: 0.2,
  fontWeight: '500',
} satisfies TextStyle;

export const meta = {
  fontFamily,
  fontSize: 11.5,
  lineHeight: 15,
  letterSpacing: -0.02,
  fontWeight: '400',
} satisfies TextStyle;

export const numeric = {
  fontFamily,
  fontSize: 26,
  lineHeight: 29,
  letterSpacing: -1,
  fontWeight: '500',
} satisfies TextStyle;

export const type = { display, displaySmall, title, body, bodyStrong, small, micro, meta, numeric };
