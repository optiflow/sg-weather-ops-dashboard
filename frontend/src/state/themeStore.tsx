import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'apple' | 'cotton-candy' | 'night-city' | 'pixel' | 'terminal';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('weather_starter_theme') as Theme) || 'apple';
  });

  useEffect(() => {
    localStorage.setItem('weather_starter_theme', theme);
    document.body.className = `theme-${theme}`;
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
