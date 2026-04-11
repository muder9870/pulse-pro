import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';

// Mock useAppStore to capture setActiveTheme calls
const mockSetActiveTheme = vi.fn();
vi.mock('../store/appStore', () => ({
  useAppStore: vi.fn((selector) => {
    const store = { setActiveTheme: mockSetActiveTheme };
    return selector ? selector(store) : store;
  }),
}));

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
    // 🚨 CRITICAL: Complete state isolation
    mockSetActiveTheme.mockClear();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
    
    // Mock system preference to light mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    
    // Reset any CSS variables
    const root = document.documentElement;
    root.style.removeProperty('--color-background');
    root.style.removeProperty('--color-text-primary');
    root.style.removeProperty('--color-border');
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--color-secondary');
    root.style.removeProperty('--color-success');
    root.style.removeProperty('--color-danger');
    root.style.removeProperty('--color-warning');
    root.style.removeProperty('--color-info');
    root.style.removeProperty('--color-surface');
    root.style.removeProperty('--color-text-secondary');
  });

  afterEach(() => {
    cleanup(); // Prevents lingering components, memory leaks, act() warnings
    localStorage.clear();
    // Double-clean to prevent cross-test contamination
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
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

/**
 * Preservation — Non-Azure Theme Behavior Unchanged
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * These tests MUST PASS on unfixed code — they capture the baseline behavior
 * that the fix must preserve. Light, dark, and system themes should continue
 * to work exactly as before: correct CSS classes, no azure classes, and
 * localStorage written to the 'theme' key (not 'pulse-theme').
 *
 * Property 2: For all inputs where isBugCondition is false (light/dark/system),
 * the fixed code must produce the same behavior as the original code.
 */
describe('Preservation — Non-Azure Themes', () => {
  const NON_AZURE_THEMES = ['light', 'dark', 'system'];

  const PreservationTestComponent = ({ themeToSet }) => {
    const { setTheme } = useTheme();
    return (
      <button onClick={() => setTheme(themeToSet)} data-testid="set-theme-btn">
        Set Theme
      </button>
    );
  };

  beforeEach(() => {
    mockSetActiveTheme.mockClear();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');

    // Default: system preference is light
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  // Property-based style: for all non-azure themes, setActiveTheme is never
  // called with an azure string value (passes on unfixed code since it's never
  // called at all; passes on fixed code since only 'light'/'dark' are passed).
  it.each(NON_AZURE_THEMES)(
    'setTheme("%s") never calls setActiveTheme with an azure string',
    (themeValue) => {
      // Validates: Requirements 3.1, 3.2, 3.3
      render(
        <ThemeProvider>
          <PreservationTestComponent themeToSet={themeValue} />
        </ThemeProvider>
      );

      act(() => {
        screen.getByTestId('set-theme-btn').click();
      });

      expect(mockSetActiveTheme).not.toHaveBeenCalledWith('electric-azure-light');
      expect(mockSetActiveTheme).not.toHaveBeenCalledWith('electric-azure-dark');
    }
  );

  it('setTheme("light") — no azure CSS classes on document root', () => {
    // Validates: Requirements 3.1
    render(
      <ThemeProvider>
        <PreservationTestComponent themeToSet="light" />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-theme-btn').click();
    });

    expect(document.documentElement.classList.contains('theme-electric-azure-light')).toBe(false);
    expect(document.documentElement.classList.contains('theme-electric-azure-dark')).toBe(false);
  });

  it('setTheme("light") — dark class is absent', () => {
    // Validates: Requirements 3.1
    render(
      <ThemeProvider defaultTheme="dark">
        <PreservationTestComponent themeToSet="light" />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-theme-btn').click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setTheme("dark") — dark class is present and no azure classes', () => {
    // Validates: Requirements 3.2
    render(
      <ThemeProvider>
        <PreservationTestComponent themeToSet="dark" />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-theme-btn').click();
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-electric-azure-light')).toBe(false);
    expect(document.documentElement.classList.contains('theme-electric-azure-dark')).toBe(false);
  });

  it('setTheme("system") — resolves to OS preference (light) and no azure classes', () => {
    // Validates: Requirements 3.3
    // matchMedia mocked to return light preference in beforeEach
    render(
      <ThemeProvider>
        <PreservationTestComponent themeToSet="system" />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-theme-btn').click();
    });

    expect(document.documentElement.classList.contains('theme-electric-azure-light')).toBe(false);
    expect(document.documentElement.classList.contains('theme-electric-azure-dark')).toBe(false);
    // System resolved to light → dark class should be absent
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setTheme("system") — resolves to dark when OS prefers dark, no azure classes', () => {
    // Validates: Requirements 3.3
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <PreservationTestComponent themeToSet="system" />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-theme-btn').click();
    });

    expect(document.documentElement.classList.contains('theme-electric-azure-light')).toBe(false);
    expect(document.documentElement.classList.contains('theme-electric-azure-dark')).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('localStorage key "theme" is written after setTheme("light")', () => {
    // Validates: Requirements 3.4
    render(
      <ThemeProvider>
        <PreservationTestComponent themeToSet="light" />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-theme-btn').click();
    });

    expect(localStorage.getItem('theme')).toBe('light');
    expect(localStorage.getItem('pulse-theme')).toBeNull();
  });

  it('localStorage key "theme" is written after setTheme("dark")', () => {
    // Validates: Requirements 3.4
    render(
      <ThemeProvider>
        <PreservationTestComponent themeToSet="dark" />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-theme-btn').click();
    });

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('pulse-theme')).toBeNull();
  });

  it('localStorage key "theme" is written after setTheme("system")', () => {
    // Validates: Requirements 3.4
    render(
      <ThemeProvider>
        <PreservationTestComponent themeToSet="system" />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-theme-btn').click();
    });

    expect(localStorage.getItem('theme')).toBe('system');
    expect(localStorage.getItem('pulse-theme')).toBeNull();
  });
});

/**
 * Bug Condition — Azure Zustand Sync
 *
 * Validates: Requirements 1.1, 1.2
 *
 * These tests MUST FAIL on unfixed code — failure confirms the bug exists.
 * ThemeProvider never calls setActiveTheme for Azure themes, so Zustand
 * activeTheme is never updated when electric-azure-light or electric-azure-dark
 * is selected.
 *
 * When the fix is applied (Task 3.1), these tests will pass.
 */
describe('Bug Condition — Azure Zustand Sync', () => {
  const AzureTestComponent = () => {
    const { setTheme } = useTheme();
    return (
      <div>
        <button onClick={() => setTheme('electric-azure-light')} data-testid="set-azure-light">
          Azure Light
        </button>
        <button onClick={() => setTheme('electric-azure-dark')} data-testid="set-azure-dark">
          Azure Dark
        </button>
      </div>
    );
  };

  beforeEach(() => {
    mockSetActiveTheme.mockClear();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('calls setActiveTheme with "light" when electric-azure-light is selected', () => {
    // Validates: Requirements 1.1, 1.2
    // EXPECTED TO FAIL on unfixed code — ThemeProvider never calls setActiveTheme
    render(
      <ThemeProvider>
        <AzureTestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-azure-light').click();
    });

    expect(mockSetActiveTheme).toHaveBeenCalledWith('light');
  });

  it('calls setActiveTheme with "dark" when electric-azure-dark is selected', () => {
    // Validates: Requirements 1.1, 1.2
    // EXPECTED TO FAIL on unfixed code — ThemeProvider never calls setActiveTheme
    render(
      <ThemeProvider>
        <AzureTestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-azure-dark').click();
    });

    expect(mockSetActiveTheme).toHaveBeenCalledWith('dark');
  });

  it('applies theme-electric-azure-light CSS class AND calls setActiveTheme (CSS passes, Zustand fails)', () => {
    // Validates: Requirements 1.1, 1.2
    // CSS class assertion PASSES on unfixed code (ThemeProvider does apply CSS correctly)
    // setActiveTheme assertion FAILS on unfixed code (ThemeProvider never syncs Zustand)
    render(
      <ThemeProvider>
        <AzureTestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId('set-azure-light').click();
    });

    // CSS side — this PASSES even on unfixed code
    expect(document.documentElement.classList.contains('theme-electric-azure-light')).toBe(true);

    // Zustand side — this FAILS on unfixed code (confirms the bug)
    expect(mockSetActiveTheme).toHaveBeenCalledWith('light');
  });
});
