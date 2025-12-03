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

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    // Local storage'dan mode'u al, yoksa sistem tercihini kullan
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedMode) {
      return savedMode;
    }
    
    // Sistem dark mode tercihini kontrol et
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
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

  // Sistem tema değişikliklerini dinle
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Eğer kullanıcı manuel bir tercih yapmadıysa sistem tercihini takip et
      const savedMode = localStorage.getItem('theme-mode');
      if (!savedMode) {
        setModeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

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
};
