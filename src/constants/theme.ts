import { Platform } from 'react-native';

export const AppColors = {
  ink: '#061318',
  inkElevated: '#0B1E24',
  panel: '#102A31',
  panelSoft: '#15363D',
  border: '#21454B',
  borderBright: '#2D625F',
  text: '#F4FBF9',
  textMuted: '#9CB8B2',
  textDim: '#6E8E89',
  mint: '#35E2B4',
  mintDark: '#123F37',
  cyan: '#54D8E8',
  blue: '#7698FF',
  purple: '#B18CFF',
  amber: '#FFC66E',
  red: '#FF7D79',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Compatibility values for the small set of Expo starter helpers retained in the repo.
export const Colors = {
  light: {
    text: AppColors.text,
    background: AppColors.ink,
    backgroundElement: AppColors.panel,
    backgroundSelected: AppColors.panelSoft,
    textSecondary: AppColors.textMuted,
  },
  dark: {
    text: AppColors.text,
    background: AppColors.ink,
    backgroundElement: AppColors.panel,
    backgroundSelected: AppColors.panelSoft,
    textSecondary: AppColors.textMuted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: 'ui-serif, Georgia, serif',
    rounded: "Inter, ui-rounded, system-ui, sans-serif",
    mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
  },
});

export const MaxContentWidth = 760;
export const BottomTabInset = Platform.select({ ios: 54, android: 70, web: 24 }) ?? 24;

