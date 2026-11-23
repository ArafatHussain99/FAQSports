import { StyleSheet, TextStyle } from 'react-native';

// Spacing, shape and type tokens for "The Fixture Sheet".
// Colours live in constants/colors.tsx.

export const Space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20, // screen gutter
  xxl: 24,
  xxxl: 32,
  section: 28, // space above a section heading
} as const;

export const Radius = {
  xs: 2, // highlighter block
  sm: 4, // tags
  md: 8, // buttons, inputs, score keys
  lg: 12, // sheets
  pill: 999,
} as const;

export const Hairline = StyleSheet.hairlineWidth;

/** Minimum touch target (Android 48dp covers iOS 44pt). */
export const Touch = 48;

// Type scale: system face only (SF on iOS, Roboto on Android).
// Hierarchy comes from size; text scales with the OS font-size setting.
export const Type = {
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  subhead: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  tag: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.6 },
  // Score numerals: tabular so digits don't jump between balls.
  scoreXL: { fontSize: 64, lineHeight: 68, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  scoreL: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  scoreM: { fontSize: 24, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  number: { fontSize: 16, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;
