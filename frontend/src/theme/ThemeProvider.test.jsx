import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';

// Test component that uses the theme
const TestComponent = () => {
  const { theme, toggleTheme, setTheme, tokens } = useTheme();
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <button onClick={toggleTheme} data-testid="toggle-button">
        Toggle Theme
      </button>
      <button onClick={() => setTheme('light')} data-testid="set-light-button">
        Set Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark-button">
        Set Dark
      </button>
      <div data-testid="tokens-exist">{tokens ? 'yes' : 'no'}</div>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset document root classes and attributes
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Test Child</div>
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('provides theme context to children', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('current-theme')).toBeInTheDocument();
      expect(screen.getByTestId('tokens-exist')).toHaveTextContent('yes');
    });
  });

  describe('Initial Theme', () => {
    it('defaults to light theme when no preference is set', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    it('uses localStorage preference if available', () => {
      localStorage.setItem('theme', 'dark');
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('respects defaultTheme prop', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('detects system dark mode preference when no localStorage value', () => {
      // Mock matchMedia to return dark mode preference
      const mockMatchMedia = vi.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      
      window.matchMedia = mockMatchMedia;
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });
  });

  describe('Theme Switching', () => {
    it('toggles theme from light to dark', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      
      act(() => {
        screen.getByTestId('toggle-button').click();
      });
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('toggles theme from dark to light', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      
      act(() => {
        screen.getByTestId('toggle-button').click();
      });
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    it('sets theme to light', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>
      );
      
      act(() => {
        screen.getByTestId('set-light-button').click();
      });
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });

    it('sets theme to dark', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      act(() => {
        screen.getByTestId('set-dark-button').click();
      });
      
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });
  });

  describe('localStorage Persistence', () => {
    it('persists theme to localStorage when changed', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      act(() => {
        screen.getByTestId('toggle-button').click();
      });
      
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('updates localStorage when theme is set directly', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      act(() => {
        screen.getByTestId('set-dark-button').click();
      });
      
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('CSS Variables', () => {
    it('sets CSS variables on document root', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-primary')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-background')).toBeTruthy();
    });

    it('updates CSS variables when theme changes', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      const root = document.documentElement;
      const lightPrimary = root.style.getPropertyValue('--color-primary');
      
      act(() => {
        screen.getByTestId('toggle-button').click();
      });
      
      const darkPrimary = root.style.getPropertyValue('--color-primary');
      expect(darkPrimary).not.toBe(lightPrimary);
    });

    it('sets data-theme attribute on document root', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      
      act(() => {
        screen.getByTestId('toggle-button').click();
      });
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('adds dark class to document root in dark mode', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from document root in light mode', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>
      );
      
      act(() => {
        screen.getByTestId('set-light-button').click();
      });
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('throws error when useTheme is used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');
      
      consoleSpy.mockRestore();
    });

    it('warns when invalid theme is set', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const InvalidThemeComponent = () => {
        const { setTheme } = useTheme();
        return (
          <button onClick={() => setTheme('invalid')} data-testid="invalid-button">
            Set Invalid
          </button>
        );
      };
      
      render(
        <ThemeProvider>
          <InvalidThemeComponent />
        </ThemeProvider>
      );
      
      act(() => {
        screen.getByTestId('invalid-button').click();
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid theme "invalid"')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Theme Tokens', () => {
    it('provides theme tokens through context', () => {
      const TokensComponent = () => {
        const { tokens } = useTheme();
        return (
          <div>
            <div data-testid="primary-light">{tokens.colors.primary.light}</div>
            <div data-testid="spacing-md">{tokens.spacing.md}</div>
          </div>
        );
      };
      
      render(
        <ThemeProvider>
          <TokensComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('primary-light')).toHaveTextContent('#4F46E5');
      expect(screen.getByTestId('spacing-md')).toHaveTextContent('1rem');
    });
  });

  describe('Selector Pattern', () => {
    it('returns entire context when no selector is provided', () => {
      const SelectorComponent = () => {
        const context = useTheme();
        return (
          <div>
            <div data-testid="has-theme">{context.theme ? 'yes' : 'no'}</div>
            <div data-testid="has-tokens">{context.tokens ? 'yes' : 'no'}</div>
            <div data-testid="has-toggle">{context.toggleTheme ? 'yes' : 'no'}</div>
            <div data-testid="has-set">{context.setTheme ? 'yes' : 'no'}</div>
          </div>
        );
      };
      
      render(
        <ThemeProvider>
          <SelectorComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('has-theme')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-tokens')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-toggle')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-set')).toHaveTextContent('yes');
    });

    it('returns selected value when selector is provided', () => {
      const SelectorComponent = () => {
        const currentTheme = useTheme(ctx => ctx.theme);
        return <div data-testid="selected-theme">{currentTheme}</div>;
      };
      
      render(
        <ThemeProvider>
          <SelectorComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('selected-theme')).toHaveTextContent('light');
    });

    it('selector can extract nested values', () => {
      const SelectorComponent = () => {
        const primaryColor = useTheme(ctx => ctx.tokens.colors.primary.light);
        return <div data-testid="primary-color">{primaryColor}</div>;
      };
      
      render(
        <ThemeProvider>
          <SelectorComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('primary-color')).toHaveTextContent('#4F46E5');
    });

    it('selector can extract multiple values', () => {
      const SelectorComponent = () => {
        const { theme, primaryColor } = useTheme(ctx => ({
          theme: ctx.theme,
          primaryColor: ctx.tokens.colors.primary[ctx.theme]
        }));
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="color">{primaryColor}</div>
          </div>
        );
      };
      
      render(
        <ThemeProvider>
          <SelectorComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
      expect(screen.getByTestId('color')).toHaveTextContent('#4F46E5');
    });

    it('selector updates when selected value changes', () => {
      const SelectorComponent = () => {
        const currentTheme = useTheme(ctx => ctx.theme);
        const { toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="selected-theme">{currentTheme}</div>
            <button onClick={toggleTheme} data-testid="toggle">Toggle</button>
          </div>
        );
      };
      
      render(
        <ThemeProvider>
          <SelectorComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('selected-theme')).toHaveTextContent('light');
      
      act(() => {
        screen.getByTestId('toggle').click();
      });
      
      expect(screen.getByTestId('selected-theme')).toHaveTextContent('dark');
    });
  });
});
