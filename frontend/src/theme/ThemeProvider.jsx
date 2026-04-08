import React, { createContext, useContext, useEffect, useState } from 'react';
import { themeTokens } from './tokens';

/**
 * Theme Context
 * Provides theme state and functions to all components
 */
const ThemeContext = createContext(undefined);

/**
 * Get initial theme preference
 * Priority: localStorage > system preference > default (light)
 */
const getInitialTheme = () => {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    
    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  
  return 'light';
};

/**
 * ThemeProvider Component
 * 
 * Manages theme state (light/dark) and provides theme tokens to all child components.
 * Features:
 * - Persists theme preference to localStorage
 * - Detects and respects system dark mode preference on initial load
 * - Sets CSS variables on document root for theme tokens
 * - Provides theme context to all child components
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} [props.defaultTheme] - Override default theme detection
 */
export const ThemeProvider = ({ children, defaultTheme }) => {
  const [theme, setThemeState] = useState(() => defaultTheme || getInitialTheme());

  /**
   * Set CSS variables on document root for all theme tokens
   */
  useEffect(() => {
    const root = document.documentElement;
    const colors = themeTokens.colors;

    // Set color CSS variables
    root.style.setProperty('--color-primary', colors.primary[theme]);
    root.style.setProperty('--color-secondary', colors.secondary[theme]);
    root.style.setProperty('--color-success', colors.success[theme]);
    root.style.setProperty('--color-danger', colors.danger[theme]);
    root.style.setProperty('--color-warning', colors.warning[theme]);
    root.style.setProperty('--color-info', colors.info[theme]);
    root.style.setProperty('--color-background', colors.background[theme]);
    root.style.setProperty('--color-surface', colors.surface[theme]);
    root.style.setProperty('--color-text-primary', colors.text.primary[theme]);
    root.style.setProperty('--color-text-secondary', colors.text.secondary[theme]);
    root.style.setProperty('--color-border', colors.border[theme]);

    // Set data attribute for theme-based styling
    root.setAttribute('data-theme', theme);
    
    // Update document class for Tailwind dark mode
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

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
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    } else {
      console.warn(`Invalid theme "${newTheme}". Valid themes are: "light", "dark"`);
    }
  };

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    setThemeState((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
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
