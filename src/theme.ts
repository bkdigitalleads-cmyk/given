import { useColorScheme } from 'react-native';

export interface Theme {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  danger: string;
  border: string;
  success: string;
  isDark: boolean;
}

// Given palette: raspberry on blush-white — generous, warm, a little festive
// (giving season). Night mode is deep plum with a coral-pink accent.
// Visually unrelated to our other apps (green, teal, blue, purple, terracotta).
export const lightTheme: Theme = {
  bg: '#FBF6F7',
  card: '#FFFFFF',
  cardAlt: '#F4E8EC',
  text: '#241A1E',
  textSecondary: '#6E5A62',
  textFaint: '#A28F97',
  accent: '#B4234B',
  accentSoft: '#F9DEE6',
  danger: '#C53030',
  border: '#EADDE1',
  success: '#2F7D4F',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#1A1215',
  card: '#251B20',
  cardAlt: '#31262B',
  text: '#F6ECF0',
  textSecondary: '#C4B0B8',
  textFaint: '#85727A',
  accent: '#F06A8C',
  accentSoft: '#3D2230',
  danger: '#F56565',
  border: '#3B2E34',
  success: '#68B587',
  isDark: true,
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export const fonts = {
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
