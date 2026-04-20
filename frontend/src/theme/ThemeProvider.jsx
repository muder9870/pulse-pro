import React, { createContext, useContext, useEffect, useState } from 'react';
import { themeTokens } from './tokens';
import { useAppStore } from '../store/appStore';

/**
 * Theme Context
 * Provides theme state and functions to all components
 */
const ThemeContext = createContext(undefined);

/**
 * Get initial theme preference - deterministic priority chain
 * Priority: defaultTheme > localStorage > system preference > 'light'
 */
const getInitialTheme = (defaultTheme) => {
  const validThemes = ['light', 'dark', 'electric-azure-light', 'electric-azure-dark', 'system'];

  // 1. Explicit control (highest priority)
  if (defaultTheme && validThemes.includes(defaultTheme)) {
    return defaultTheme;
  }

  // 2. User preference (persistent)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme');
    if (stored && validThemes.includes(stored)) return stored;

    // 3. System preference (controlled influence, lowest priority)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }

  // 4. Deterministic fallback (no randomness)
  return 'light';
};

/**
 * ThemeProvider Component
 * 
 * Manages theme state (light/dark) and provides theme tokens to all child components.
 * Features:
 * - Deterministic theme resolution with explicit priority chain
 * - Reacts to defaultTheme prop changes (controlled component pattern)
 * - Persists theme preference to localStorage
 * - Sets CSS variables on document root for theme tokens
 * - Provides theme context to all child components
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} [props.defaultTheme] - Override default theme detection
 */
export const ThemeProvider = ({ children, defaultTheme }) => {
  const [theme, setThemeState] = useState(() => getInitialTheme(defaultTheme));
  const setActiveTheme = useAppStore((s) => s.setActiveTheme);

  // 🚨 CRITICAL: React to defaultTheme changes
  useEffect(() => {
    const validThemes = ['light', 'dark', 'electric-azure-light', 'electric-azure-dark', 'system'];
    if (defaultTheme && validThemes.includes(defaultTheme)) {
      setThemeState(defaultTheme);
    }
  }, [defaultTheme]);

  /**
   * Set CSS variables on document root for all theme tokens - explicit DOM control
   */
  useEffect(() => {
    const root = document.documentElement;

    // Determine which color palette to use
    let colors;
    let themeMode = 'light';

    if (theme === 'electric-azure-light') {
      colors = themeTokens.electricAzureLight.colors;
      themeMode = 'light';
      root.classList.add('theme-electric-azure-light');
      root.classList.remove('theme-electric-azure-dark', 'dark');
    } else if (theme === 'electric-azure-dark') {
      colors = themeTokens.electricAzureDark.colors;
      themeMode = 'dark';
      root.classList.add('theme-electric-azure-dark', 'dark');
      root.classList.remove('theme-electric-azure-light');
    } else if (theme === 'system') {
      colors = themeTokens.colors;
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      themeMode = prefersDark ? 'dark' : 'light';
      root.classList.toggle('dark', prefersDark);
      root.classList.remove('theme-electric-azure-light', 'theme-electric-azure-dark');
    } else {
      // light or dark
      colors = themeTokens.colors;
      themeMode = theme;
      root.classList.remove('theme-electric-azure-light', 'theme-electric-azure-dark');
      root.classList.toggle('dark', theme === 'dark');
    }

    // Single source of truth for theme state
    root.setAttribute('data-theme', theme);

    // Consistent token injection
    root.style.setProperty('--color-primary', colors.primary[themeMode]);
    root.style.setProperty('--color-secondary', colors.secondary[themeMode]);
    root.style.setProperty('--color-success', colors.success[themeMode]);
    root.style.setProperty('--color-danger', colors.danger[themeMode]);
    root.style.setProperty('--color-warning', colors.warning[themeMode]);
    root.style.setProperty('--color-info', colors.info[themeMode]);
    root.style.setProperty('--color-background', colors.background[themeMode]);
    root.style.setProperty('--color-surface', colors.surface[themeMode]);
    root.style.setProperty('--color-text-primary', colors.text.primary[themeMode]);
    root.style.setProperty('--color-text-secondary', colors.text.secondary[themeMode]);
    root.style.setProperty('--color-border', colors.border[themeMode]);

    // T7: Bridge --color-* to Pulse shell vars for unified theming
    // This ensures Button.jsx and all shell components use the same visual language
    // regardless of which token layer they consume (--color-* vs --accent/--surface)
    // Per DESIGN_SYSTEM_GUIDE.md § 2.2: Map --color-* to Pulse tokens
    root.style.setProperty('--color-primary', 'var(--accent)');
    root.style.setProperty('--color-secondary', 'var(--accent2)');
    root.style.setProperty('--color-success', 'var(--teal)');
    root.style.setProperty('--color-danger', 'var(--red)');
    root.style.setProperty('--color-warning', 'var(--amber)');
    root.style.setProperty('--color-info', 'var(--accent)');
    root.style.setProperty('--color-background', 'var(--bg)');
    root.style.setProperty('--color-surface', 'var(--surface)');
    root.style.setProperty('--color-text-primary', 'var(--text)');
    root.style.setProperty('--color-text-secondary', 'var(--text2)');
    root.style.setProperty('--color-border', 'var(--border)');

    setActiveTheme(themeMode);
  }, [theme, setActiveTheme]);

  /**
   * Persist theme preference to localStorage
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  /**
   * Listen for system theme changes
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only update if user hasn't manually set a preference
      const stored = localStorage.getItem('theme');
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  /**
   * Set theme and persist to localStorage
   */
  const setTheme = (newTheme) => {
    const validThemes = ['light', 'dark', 'electric-azure-light', 'electric-azure-dark', 'system'];
    if (validThemes.includes(newTheme)) {
      setThemeState(newTheme);
    } else {
      console.warn(`Invalid theme "${newTheme}". Valid themes are: ${validThemes.join(', ')}`);
    }
  };

  /**
   * Toggle between themes (cycling through: light -> dark -> electric-azure-light -> electric-azure-dark -> system -> light)
   */
  const toggleTheme = () => {
    setThemeState((prevTheme) => {
      const themes = ['light', 'dark', 'electric-azure-light', 'electric-azure-dark', 'system'];
      const currentIndex = themes.indexOf(prevTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      return themes[nextIndex];
    });
  };

  const value = {
    theme,
    tokens: themeTokens,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme Hook
 * 
 * Access theme context in any component.
 * Must be used within a ThemeProvider.
 * 
 * Supports optional selector pattern to prevent unnecessary re-renders:
 * - Without selector: Returns entire theme context (re-renders on any theme change)
 * - With selector: Returns selected value (re-renders only when that value changes)
 * 
 * @param {Function} [selector] - Optional selector function to extract specific values
 * @returns {Object|*} Theme context or selected value
 * @returns {string} return.theme - Current theme ('light' or 'dark')
 * @returns {Object} return.tokens - Theme tokens object
 * @returns {Function} return.setTheme - Set theme to specific value
 * @returns {Function} return.toggleTheme - Toggle between light and dark
 * 
 * @example
 * // Without selector - re-renders on any theme change
 * const { theme, toggleTheme } = useTheme();
 * 
 * @example
 * // With selector - only re-renders when primary color changes
 * const primaryColor = useTheme(theme => theme.tokens.colors.primary);
 * 
 * @example
 * // With selector - only re-renders when theme mode changes
 * const currentTheme = useTheme(theme => theme.theme);
 */
export const useTheme = (selector) => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  // If selector is provided, return selected value
  // Otherwise return entire context
  return selector ? selector(context) : context;
};

export default ThemeProvider;
