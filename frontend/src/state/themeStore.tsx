import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

export type Theme = 'apple' | 'cotton-candy' | 'night-city' | 'pixel' | 'terminal';

export const THEMES = [
  { value: 'apple', label: 'Apple' },
  { value: 'cotton-candy', label: 'Cotton Candy' },
  { value: 'night-city', label: 'Night City' },
  { value: 'pixel', label: 'Pixel' },
  { value: 'terminal', label: 'Terminal' },
] as const satisfies ReadonlyArray<{ value: Theme; label: string }>;

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = 'sg_weather_ops_dashboard_theme';

function isTheme(value: string | null): value is Theme {
  return THEMES.some((theme) => theme.value === value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'apple';
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : 'apple';
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.body.classList.remove(...THEMES.map((item) => `theme-${item.value}`));
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
