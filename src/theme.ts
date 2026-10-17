import { useColorScheme } from 'react-native';

const light = {
  bg: '#F7F7F5',
  card: '#FFFFFF',
  text: '#1B1B1F',
  muted: '#5C5F66',
  accent: '#2F5BEA',
  accentText: '#FFFFFF',
  border: '#DADCE0',
  success: '#1E7A46',
  warning: '#A15C00',
  danger: '#B3261E',
};

const dark: typeof light = {
  bg: '#121214',
  card: '#1E1E22',
  text: '#F2F2F4',
  muted: '#A9ACB3',
  accent: '#8AA8FF',
  accentText: '#0B1A44',
  border: '#34353A',
  success: '#6FD49A',
  warning: '#F2B45C',
  danger: '#FF8A80',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
