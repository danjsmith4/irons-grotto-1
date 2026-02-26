'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeId } from '@/app/types/theme';
import { getThemes, getThemeById } from '@/app/config/themes';

interface ThemeContextType {
  currentTheme: Theme;
  themes: Theme[];
  setTheme: (themeId: ThemeId) => void;
  applyThemeToDom: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeId;
}

export function ThemeProvider({ children, defaultTheme = 'irons-grotto' }: ThemeProviderProps) {
  const themes = getThemes();
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getThemeById(defaultTheme));

  // Apply theme CSS custom properties to document root
  const applyThemeToDom = (theme: Theme) => {
    const root = document.documentElement;
    const colors = theme.colors;
    
    // Set CSS custom properties
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-tertiary', colors.tertiary);
    root.style.setProperty('--theme-text-primary', colors.textPrimary);
    root.style.setProperty('--theme-text-secondary', colors.textSecondary);
    
    // Set derived colors
    root.style.setProperty('--theme-primary-gradient', colors.primaryGradient);
    root.style.setProperty('--theme-secondary-gradient', colors.secondaryGradient);
    root.style.setProperty('--theme-surface-gradient', colors.surfaceGradient);
    
    root.style.setProperty('--theme-surface-1', colors.surface1);
    root.style.setProperty('--theme-surface-2', colors.surface2);
    root.style.setProperty('--theme-surface-3', colors.surface3);
    
    // Set alpha variants for common opacities
    root.style.setProperty('--theme-primary-alpha-10', colors.primaryAlpha(0.1));
    root.style.setProperty('--theme-primary-alpha-20', colors.primaryAlpha(0.2));
    root.style.setProperty('--theme-primary-alpha-30', colors.primaryAlpha(0.3));
    root.style.setProperty('--theme-primary-alpha-50', colors.primaryAlpha(0.5));
    root.style.setProperty('--theme-primary-alpha-80', colors.primaryAlpha(0.8));
    
    root.style.setProperty('--theme-secondary-alpha-10', colors.secondaryAlpha(0.1));
    root.style.setProperty('--theme-secondary-alpha-20', colors.secondaryAlpha(0.2));
    root.style.setProperty('--theme-secondary-alpha-30', colors.secondaryAlpha(0.3));
    root.style.setProperty('--theme-secondary-alpha-50', colors.secondaryAlpha(0.5));
    root.style.setProperty('--theme-secondary-alpha-95', colors.secondaryAlpha(0.95));
    
    root.style.setProperty('--theme-tertiary-alpha-10', colors.tertiaryAlpha(0.1));
    root.style.setProperty('--theme-tertiary-alpha-20', colors.tertiaryAlpha(0.2));
  };

  const setTheme = (themeId: ThemeId) => {
    const newTheme = getThemeById(themeId);
    setCurrentTheme(newTheme);
    applyThemeToDom(newTheme);
    
    // Persist theme choice in cookie
    document.cookie = `theme=${themeId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  };

  // Load theme from cookie on mount
  useEffect(() => {
    const cookies = document.cookie.split(';');
    const themeCookie = cookies.find(cookie => cookie.trim().startsWith('theme='));
    
    if (themeCookie) {
      const savedThemeId = themeCookie.split('=')[1] as ThemeId;
      if (savedThemeId !== currentTheme.id) {
        const savedTheme = getThemeById(savedThemeId);
        setCurrentTheme(savedTheme);
        applyThemeToDom(savedTheme);
      }
    } else {
      // Apply default theme
      applyThemeToDom(currentTheme);
    }
  }, []);

  const contextValue: ThemeContextType = {
    currentTheme,
    themes,
    setTheme,
    applyThemeToDom,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}