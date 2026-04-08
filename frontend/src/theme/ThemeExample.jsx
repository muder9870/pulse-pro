import React from 'react';
import { useTheme } from './ThemeProvider';

/**
 * Example component demonstrating selector pattern
 * Only re-renders when the selected value changes
 */
const OptimizedColorDisplay = () => {
  // Using selector - only re-renders when primary color changes
  const primaryColor = useTheme(ctx => ctx.tokens.colors.primary[ctx.theme]);
  
  return (
    <div className="p-3 rounded border" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        Optimized Component (with selector)
      </p>
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Only re-renders when primary color changes
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded"
          style={{ backgroundColor: primaryColor }}
        />
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {primaryColor}
        </span>
      </div>
    </div>
  );
};

/**
 * Example component without selector pattern
 * Re-renders on any theme context change
 */
const UnoptimizedColorDisplay = () => {
  // Without selector - re-renders on ANY theme change
  const { tokens, theme } = useTheme();
  const primaryColor = tokens.colors.primary[theme];
  
  return (
    <div className="p-3 rounded border" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        Standard Component (without selector)
      </p>
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Re-renders on any theme change
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div
          className="w-6 h-6 rounded"
          style={{ backgroundColor: primaryColor }}
        />
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {primaryColor}
        </span>
      </div>
    </div>
  );
};

/**
 * Example component demonstrating ThemeProvider usage
 * This can be used to test the theme system in the browser
 */
const ThemeExample = () => {
  const { theme, toggleTheme, tokens } = useTheme();

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Theme System Example
        </h1>
        
        <div className="flex items-center gap-4">
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Current theme: <strong>{theme}</strong>
          </p>
          
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            Toggle Theme
          </button>
        </div>
      </div>

      {/* Selector Pattern Demo */}
      <div
        className="p-4 rounded-lg space-y-3"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Selector Pattern Demo
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          The selector pattern optimizes performance by preventing unnecessary re-renders.
          Both components below display the same data, but the optimized version only re-renders
          when the primary color changes.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <OptimizedColorDisplay />
          <UnoptimizedColorDisplay />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Color Tokens
          </h2>
          <div className="space-y-2">
            {Object.entries(tokens.colors).map(([key, value]) => {
              if (typeof value === 'object' && value.light && value.dark) {
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{
                        backgroundColor: value[theme],
                        borderColor: 'var(--color-border)',
                      }}
                    />
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {key}: {value[theme]}
                    </span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>

        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Variant Colors
          </h2>
          <div className="space-y-2">
            {['primary', 'secondary', 'success', 'danger', 'warning', 'info'].map((variant) => (
              <button
                key={variant}
                className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: `var(--color-${variant})`,
                  color: 'white',
                }}
              >
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderLeft: '4px solid var(--color-primary)',
        }}
      >
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Theme Features
        </h2>
        <ul className="space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
          <li>✓ Automatic localStorage persistence</li>
          <li>✓ System dark mode detection</li>
          <li>✓ CSS variables for all tokens</li>
          <li>✓ Smooth transitions (200ms)</li>
          <li>✓ WCAG 2.1 AA compliant contrast ratios</li>
          <li>✓ Selector pattern for optimized re-renders</li>
        </ul>
      </div>
    </div>
  );
};

export default ThemeExample;
