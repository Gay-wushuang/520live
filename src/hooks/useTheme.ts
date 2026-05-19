import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';
const THEMES = new Set<Theme>(['light', 'dark']);

function getSavedTheme(): Theme | null {
  try {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme && THEMES.has(savedTheme as Theme) ? (savedTheme as Theme) : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = getSavedTheme();
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Ignore storage failures in private or restricted browser contexts.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };
} 
