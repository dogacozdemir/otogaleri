import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes, getTheme, applyTheme, type Theme } from '@/lib/themes';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  theme: Theme;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    // Local storage'dan mode'u al, yoksa light mode'u varsayılan olarak kullan
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedMode) {
      return savedMode;
    }
    
    // Varsayılan olarak light mode
    return 'light';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    const savedThemeId = localStorage.getItem('theme-id');
    return savedThemeId ? getTheme(savedThemeId) : themes[0];
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme-id', newTheme.id);
  };

  useEffect(() => {
    const root = document.documentElement;
    
    // Dark class'ını ekle/çıkar
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply theme colors
    applyTheme(theme, mode);
  }, [theme, mode]);


  const value = {
    mode,
    theme,
    toggleMode,
    setMode,
    setTheme,
    availableThemes: themes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
