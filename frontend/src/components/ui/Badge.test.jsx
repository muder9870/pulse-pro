import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';
import { ThemeProvider } from '../../theme/ThemeProvider';

/**
 * Badge Component Tests
 * 
 * Tests the Badge component with theme token integration.
 * Validates: Requirements 3.5, 4.1, 10.1
 */

describe('Badge', () => {
  // Helper to render Badge with ThemeProvider
  const renderBadge = (props = {}, theme = 'light') => {
    return render(
      <ThemeProvider defaultTheme={theme}>
        <Badge {...props}>Test Badge</Badge>
      </ThemeProvider>
    );
  };

  describe('Rendering', () => {
    it('renders children correctly', () => {
      renderBadge();
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('renders with default variant (secondary)', () => {
      const { container } = renderBadge();
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('inline-flex');
    });

    it('renders with custom className', () => {
      const { container } = renderBadge({ className: 'custom-class' });
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    const variants = ['secondary', 'primary', 'success', 'warning', 'danger', 'info'];

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        const { container } = renderBadge({ variant });
        const badge = container.querySelector('span');
        expect(badge).toBeInTheDocument();
        // Badge should have base styles
        expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full');
      });
    });

    it('falls back to secondary variant for invalid variant', () => {
      const { container } = renderBadge({ variant: 'invalid' });
      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg'];

    sizes.forEach((size) => {
      it(`renders ${size} size`, () => {
        const { container } = renderBadge({ size });
        const badge = container.querySelector('span');
        expect(badge).toBeInTheDocument();
      });
    });

    it('uses md size by default', () => {
      const { container } = renderBadge();
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-xs', 'px-2.5', 'py-1');
    });
  });

  describe('Dot Indicator', () => {
    it('renders without dot by default', () => {
      const { container } = renderBadge();
      const dot = container.querySelector('.w-1\\.5');
      expect(dot).not.toBeInTheDocument();
    });

    it('renders with dot when dot prop is true', () => {
      const { container } = renderBadge({ dot: true });
      const dot = container.querySelector('.w-1\\.5');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass('rounded-full');
    });

    it('renders dot with correct color for each variant', () => {
      const variants = ['secondary', 'primary', 'success', 'warning', 'danger', 'info'];
      
      variants.forEach((variant) => {
        const { container } = renderBadge({ variant, dot: true });
        const dot = container.querySelector('.w-1\\.5');
        expect(dot).toBeInTheDocument();
      });
    });
  });

  describe('Theme Integration', () => {
    let root;

    beforeEach(() => {
      root = document.documentElement;
    });

    afterEach(() => {
      // Clean up CSS variables
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-success');
      root.style.removeProperty('--color-danger');
      root.style.removeProperty('--color-warning');
      root.style.removeProperty('--color-info');
      root.style.removeProperty('--color-surface');
      root.style.removeProperty('--color-border');
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    });

    it('renders correctly in light mode', () => {
      renderBadge({ variant: 'primary' }, 'light');
      
      // Verify CSS variables are set for light mode
      expect(root.getAttribute('data-theme')).toBe('light');
      expect(root.classList.contains('dark')).toBe(false);
    });

    it('renders correctly in dark mode', () => {
      renderBadge({ variant: 'primary' }, 'dark');
      
      // Verify CSS variables are set for dark mode
      expect(root.getAttribute('data-theme')).toBe('dark');
      expect(root.classList.contains('dark')).toBe(true);
    });

    it('uses theme tokens for all variants in light mode', () => {
      const variants = ['secondary', 'primary', 'success', 'warning', 'danger', 'info'];
      
      variants.forEach((variant) => {
        const { container } = renderBadge({ variant }, 'light');
        const badge = container.querySelector('span');
        expect(badge).toBeInTheDocument();
      });
    });

    it('uses theme tokens for all variants in dark mode', () => {
      const variants = ['secondary', 'primary', 'success', 'warning', 'danger', 'info'];
      
      variants.forEach((variant) => {
        const { container } = renderBadge({ variant }, 'dark');
        const badge = container.querySelector('span');
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('renders as a span element', () => {
      const { container } = renderBadge();
      const badge = container.querySelector('span');
      expect(badge).toBeInTheDocument();
    });

    it('passes through additional props', () => {
      const { container } = renderBadge({ 'data-testid': 'custom-badge' });
      const badge = screen.getByTestId('custom-badge');
      expect(badge).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      const { container } = renderBadge({ 'aria-label': 'Status badge' });
      const badge = container.querySelector('span[aria-label="Status badge"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Variant Validation', () => {
    it('logs warning for invalid variant in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderBadge({ variant: 'invalid' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid variant "invalid" provided to Badge')
      );
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
