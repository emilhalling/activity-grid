export type ColorTheme = 'red' | 'green' | 'blue' | 'yellow' | 'purple';

export const themes: Record<ColorTheme | 'default', string[]> = {
  default: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'], // Current green theme
  green: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],   // Same as default
  red: ['#ebedf0', '#ffcdd2', '#ef5350', '#e53935', '#b71c1c'],
  blue: ['#ebedf0', '#bbdefb', '#64b5f6', '#1e88e5', '#0d47a1'],
  yellow: ['#ebedf0', '#fff9c4', '#ffee58', '#fdd835', '#f57f17'],
  purple: ['#ebedf0', '#e1bee7', '#ab47bc', '#8e24aa', '#4a148c']
};

export const isValidTheme = (theme: string): theme is ColorTheme => {
  return theme in themes && theme !== 'default';
};