/**
 * Theme Configuration
 * 
 * DIETER RAMS INSPIRED: Pure black and white
 * "Less, but better" - Only essential colors
 * "Good design is as little design as possible"
 */

export type Theme = 'dark' | 'light';

export interface ThemeColors {
  // Core palette - black and white only
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  
  // Functional colors - minimal, purposeful
  primary: string;      // White on dark, black on light
  primaryHover: string;
  success: string;      // Subtle green for "on" state only
  warning: string;      // Subtle yellow for alerts only
  error: string;        // Subtle red for errors only
  
  // Shield states
  shieldActive: string;
  shieldInactive: string;
}

/**
 * DIETER RAMS THEME
 * Pure black and white, inspired by Braun products
 * Minimal color, maximum function
 */
export const darkTheme: ThemeColors = {
  // Core - Pure black and white
  background: '#000000',
  surface: '#0a0a0a',
  surfaceAlt: '#141414',
  text: '#ffffff',
  textSecondary: '#999999',
  textTertiary: '#666666',
  border: '#222222',
  
  // Functional - White is the accent on dark
  primary: '#ffffff',
  primaryHover: '#e0e0e0',
  
  // Status - Subtle, only when needed
  success: '#ffffff',      // White = on
  warning: '#888888',      // Gray = warning  
  error: '#666666',        // Dark gray = error/off
  
  shieldActive: '#ffffff',
  shieldInactive: '#333333'
};

export const lightTheme: ThemeColors = {
  // Core - Pure white and black
  background: '#ffffff',
  surface: '#fafafa',
  surfaceAlt: '#f0f0f0',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#e0e0e0',
  
  // Functional - Black is the accent on light
  primary: '#000000',
  primaryHover: '#333333',
  
  // Status
  success: '#000000',
  warning: '#666666',
  error: '#999999',
  
  shieldActive: '#000000',
  shieldInactive: '#cccccc'
};

/**
 * Get theme colors based on theme mode
 * Defaults to dark mode (Dieter Rams aesthetic)
 */
export const getThemeColors = (theme: Theme = 'dark'): ThemeColors => {
  return theme === 'dark' ? darkTheme : lightTheme;
};
