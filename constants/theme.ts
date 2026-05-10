/**
 * Artemis Design System: "The Living Interface"
 * 
 * Obsidian-core color palette, dual-font typography (Space Grotesk / Manrope),
 * tonal layering elevation, and consistent spacing tokens.
 */

export const Colors = {
  // ── Core Background & Surface ──
  background: '#0e0e10',
  surface: '#0e0e10',
  surfaceDim: '#0e0e10',
  surfaceContainerLowest: '#000000',
  surfaceContainerLow: '#131316',
  surfaceContainer: '#19191c',
  surfaceContainerHigh: '#1f1f22',
  surfaceContainerHighest: '#262529',
  surfaceBright: '#2c2c2f',
  surfaceVariant: '#262529',
  surfaceTint: '#74b1ff',

  // ── On-Surface (Text / Icons) ──
  onSurface: '#fffbfe',
  onSurfaceVariant: '#adaaad',
  onBackground: '#fffbfe',

  // ── Primary (Idle State) ──
  primary: '#74b1ff',
  primaryDim: '#4da0ff',
  primaryFixed: '#54a3ff',
  primaryFixedDim: '#2695ff',
  primaryContainer: '#54a3ff',
  onPrimary: '#002f59',
  onPrimaryContainer: '#002345',
  onPrimaryFixed: '#000000',
  onPrimaryFixedVariant: '#002d55',
  inversePrimary: '#0060ac',

  // ── Secondary (Thinking State) ──
  secondary: '#b884ff',
  secondaryDim: '#9547f7',
  secondaryFixed: '#e1c7ff',
  secondaryFixedDim: '#d6b6ff',
  secondaryContainer: '#6e06d0',
  onSecondary: '#2f0060',
  onSecondaryContainer: '#ebd8ff',
  onSecondaryFixed: '#4a0090',
  onSecondaryFixedVariant: '#6f08d0',

  // ── Tertiary (Listening State) ──
  tertiary: '#81ecff',
  tertiaryDim: '#00d4ec',
  tertiaryFixed: '#00e3fd',
  tertiaryFixedDim: '#00d4ec',
  tertiaryContainer: '#00e3fd',
  onTertiary: '#005762',
  onTertiaryContainer: '#004d57',
  onTertiaryFixed: '#003840',
  onTertiaryFixedVariant: '#005762',

  // ── Error (Alert State) ──
  error: '#ff716c',
  errorDim: '#d7383b',
  errorContainer: '#9f0519',
  onError: '#490006',
  onErrorContainer: '#ffa8a3',

  // ── Outline & Inverse ──
  outline: '#767578',
  outlineVariant: '#48474a',
  inverseSurface: '#fcf8fb',
  inverseOnSurface: '#565457',
} as const;

export const Typography = {
  families: {
    headline: 'SpaceGrotesk',
    body: 'Manrope',
    label: 'Manrope',
  },
  sizes: {
    displayLg: 56,   // 3.5rem
    displayMd: 45,
    displaySm: 36,
    headlineLg: 32,
    headlineMd: 28,   // 1.75rem
    headlineSm: 24,
    titleLg: 22,
    titleMd: 16,
    titleSm: 14,
    bodyLg: 16,        // 1rem
    bodyMd: 14,
    bodySm: 12,
    labelLg: 14,
    labelMd: 12,
    labelSm: 11,       // 0.6875rem
    labelXs: 10,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const Radii = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  '3xl': 32,
  full: 9999,
} as const;
