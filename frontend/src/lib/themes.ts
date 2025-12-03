// Theme configuration system
export interface ThemeColors {
  // Base colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  
  // Primary colors
  primary: string;
  primaryForeground: string;
  
  // Secondary colors
  secondary: string;
  secondaryForeground: string;
  
  // Muted colors
  muted: string;
  mutedForeground: string;
  
  // Accent colors
  accent: string;
  accentForeground: string;
  
  // Status colors
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  destructive: string;
  destructiveForeground: string;
  
  // UI elements
  border: string;
  input: string;
  ring: string;
  
  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  
  // Sidebar colors
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

export interface Theme {
  id: string;
  name: string;
  displayName: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

// Default Professional Theme
const professionalTheme: Theme = {
  id: 'professional',
  name: 'professional',
  displayName: 'Professional Blue',
  colors: {
    light: {
      background: '210 20% 98%', // #f8f9fa
      foreground: '220 13% 18%', // #2d3748
      card: '0 0% 100%', // white
      cardForeground: '220 13% 18%', // #2d3748
      popover: '0 0% 100%', // white
      popoverForeground: '220 13% 18%', // #2d3748
      
      primary: '220 100% 25%', // #003d82
      primaryForeground: '0 0% 98%', // white
      
      secondary: '220 14% 96%', // #f1f3f4
      secondaryForeground: '220 9% 46%', // #6b7280
      
      muted: '220 14% 96%', // #f1f3f4
      mutedForeground: '220 9% 46%', // #6b7280
      
      accent: '220 60% 97%', // #f0f4ff
      accentForeground: '220 100% 25%', // #003d82
      
      success: '142 76% 36%', // #16a34a
      successForeground: '0 0% 98%', // white
      warning: '38 92% 50%', // #f59e0b
      warningForeground: '0 0% 98%', // white
      destructive: '0 84% 60%', // #ef4444
      destructiveForeground: '0 0% 98%', // white
      
      border: '220 13% 91%', // #e2e8f0
      input: '220 13% 91%', // #e2e8f0
      ring: '220 100% 25%', // #003d82
      
      chart1: '220 100% 25%', // #003d82
      chart2: '142 76% 36%', // #16a34a
      chart3: '38 92% 50%', // #f59e0b
      chart4: '0 84% 60%', // #ef4444
      chart5: '271 81% 56%', // #8b5cf6
      
      sidebarBackground: '0 0% 100%', // white
      sidebarForeground: '220 13% 18%', // #2d3748
      sidebarPrimary: '220 100% 25%', // #003d82
      sidebarPrimaryForeground: '0 0% 98%', // white
      sidebarAccent: '220 60% 97%', // #f0f4ff
      sidebarAccentForeground: '220 100% 25%', // #003d82
      sidebarBorder: '220 13% 91%', // #e2e8f0
      sidebarRing: '220 100% 25%', // #003d82
    },
    dark: {
      background: '220 27% 8%', // #0f1419
      foreground: '220 9% 89%', // #e2e8f0
      card: '220 39% 11%', // #1a202c
      cardForeground: '220 9% 89%', // #e2e8f0
      popover: '220 39% 11%', // #1a202c
      popoverForeground: '220 9% 89%', // #e2e8f0
      
      primary: '220 100% 55%', // #0066cc
      primaryForeground: '220 27% 8%', // #0f1419
      
      secondary: '220 39% 11%', // #1a202c
      secondaryForeground: '220 9% 89%', // #e2e8f0
      
      muted: '220 39% 11%', // #1a202c
      mutedForeground: '220 9% 65%', // #94a3b8
      
      accent: '220 39% 11%', // #1a202c
      accentForeground: '220 100% 55%', // #0066cc
      
      success: '142 76% 46%', // #22c55e
      successForeground: '220 27% 8%', // #0f1419
      warning: '38 92% 60%', // #fbbf24
      warningForeground: '220 27% 8%', // #0f1419
      destructive: '0 84% 70%', // #f87171
      destructiveForeground: '220 27% 8%', // #0f1419
      
      border: '220 39% 18%', // #2d3748
      input: '220 39% 18%', // #2d3748
      ring: '220 100% 55%', // #0066cc
      
      chart1: '220 100% 55%', // #0066cc
      chart2: '142 76% 46%', // #22c55e
      chart3: '38 92% 60%', // #fbbf24
      chart4: '0 84% 70%', // #f87171
      chart5: '271 81% 66%', // #a78bfa
      
      sidebarBackground: '220 27% 8%', // #0f1419
      sidebarForeground: '220 9% 89%', // #e2e8f0
      sidebarPrimary: '220 100% 55%', // #0066cc
      sidebarPrimaryForeground: '220 27% 8%', // #0f1419
      sidebarAccent: '220 39% 11%', // #1a202c
      sidebarAccentForeground: '220 100% 55%', // #0066cc
      sidebarBorder: '220 39% 18%', // #2d3748
      sidebarRing: '220 100% 55%', // #0066cc
    }
  }
};

// Available themes
export const themes: Theme[] = [
  professionalTheme
];

// Get theme by ID
export const getTheme = (themeId: string): Theme => {
  return themes.find(theme => theme.id === themeId) || professionalTheme;
};

// Apply theme to CSS variables
export const applyTheme = (theme: Theme, mode: 'light' | 'dark') => {
  const colors = theme.colors[mode];
  const root = document.documentElement;
  
  // Apply all CSS variables
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVar}`, value);
  });
};

export default themes;
