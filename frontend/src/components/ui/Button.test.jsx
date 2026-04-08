import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../theme/ThemeProvider';
import Button from './Button';

describe('Button', () => {
  describe('Theme Token Integration', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    afterEach(() => {
      // Clean up
      localStorage.clear();
    });

    it('renders with theme tokens in light mode', () => {
      render(
        <ThemeProvider defaultTheme="light">
          <Button variant="primary">Click me</Button>
        </ThemeProvider>
      );
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      
      // Verify CSS variable is being used
      const styles = window.getComputedStyle(button);
      expect(button.className).toContain('bg-[var(--color-primary)]');
    });

    it('renders with theme tokens in dark mode', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <Button variant="primary">Click me</Button>
        </ThemeProvider>
      );
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      
      // Verify dark mode class is applied to document
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('renders all variants with theme tokens', () => {
      const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'ghost'];
      
      variants.forEach(variant => {
        const { unmount } = render(
          <ThemeProvider>
            <Button variant={variant}>{variant}</Button>
          </ThemeProvider>
        );
        
        const button = screen.getByRole('button', { name: variant });
        expect(button).toBeInTheDocument();
        
        // Verify variant-specific classes are applied
        if (variant === 'primary') {
          expect(button.className).toContain('bg-[var(--color-primary)]');
        } else if (variant === 'secondary') {
          expect(button.className).toContain('bg-[var(--color-surface)]');
        } else if (variant === 'success') {
          expect(button.className).toContain('bg-[var(--color-success)]');
        } else if (variant === 'danger') {
          expect(button.className).toContain('bg-[var(--color-danger)]');
        } else if (variant === 'warning') {
          expect(button.className).toContain('bg-[var(--color-warning)]');
        } else if (variant === 'info') {
          expect(button.className).toContain('bg-[var(--color-info)]');
        } else if (variant === 'ghost') {
          expect(button.className).toContain('hover:bg-[var(--color-surface)]');
        }
        
        unmount();
      });
    });

    it('validates invalid variant and falls back to primary', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(
        <ThemeProvider>
          <Button variant="invalid">Click me</Button>
        </ThemeProvider>
      );
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      
      // Should fall back to primary variant
      expect(button.className).toContain('bg-[var(--color-primary)]');
      
      // Should log warning in development
      if (process.env.NODE_ENV === 'development') {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid variant "invalid"')
        );
      }
      
      consoleSpy.mockRestore();
    });

    it('renders with all size variants', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
      
      sizes.forEach(size => {
        const { unmount } = render(
          <ThemeProvider>
            <Button size={size}>{size}</Button>
          </ThemeProvider>
        );
        
        const button = screen.getByRole('button', { name: size });
        expect(button).toBeInTheDocument();
        
        unmount();
      });
    });

    it('renders with loading state', () => {
      render(
        <ThemeProvider>
          <Button loading>Loading</Button>
        </ThemeProvider>
      );
      
      const button = screen.getByRole('button', { name: /loading/i });
      expect(button).toBeDisabled();
      
      // Should show spinner
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('renders with icon', () => {
      const TestIcon = () => <svg data-testid="test-icon" />;
      
      render(
        <ThemeProvider>
          <Button icon={TestIcon}>With Icon</Button>
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('renders full width button', () => {
      render(
        <ThemeProvider>
          <Button fullWidth>Full Width</Button>
        </ThemeProvider>
      );
      
      const button = screen.getByRole('button', { name: /full width/i });
      expect(button.className).toContain('w-full');
    });
  });
});
