import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  const applyTheme = useCallback((selectedTheme: Theme) => {
    const root = window.document.documentElement;
    const isDark =
      selectedTheme === 'dark' ||
      (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem('localert-theme') as Theme | null;
    const initialTheme = storedTheme || 'light';
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, [applyTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  const cycleTheme = () => {
    const newTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(newTheme);
    localStorage.setItem('localert-theme', newTheme);
    applyTheme(newTheme);
  };

  return { theme, cycleTheme };
}