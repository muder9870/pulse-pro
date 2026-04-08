import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { ThemeProvider } from '../../theme/ThemeProvider';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <ThemeProvider>
          <Card>Test content</Card>
        </ThemeProvider>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders with default variant', () => {
      const { container } = render(
        <ThemeProvider>
          <Card>Content</Card>
        </ThemeProvider>
      );
      const card = container.firstChild;
      expect(card).toHaveClass('bg-[var(--color-surface)]');
      expect(card).toHaveClass('border-[var(--color-border)]');
    });

    it('renders with elevated variant', () => {
      const { container } = render(
        <ThemeProvider>
          <Card variant="elevated">Content</Card>
        </ThemeProvider>
      );
      const card = container.firstChild;
      expect(card).toHaveClass('shadow-sm');
    });

    it('renders with glass variant', () => {
      const { container } = render(
        <ThemeProvider>
          <Card variant="glass">Content</Card>
        </ThemeProvider>
      );
      const card = container.firstChild;
      expect(card).toHaveClass('backdrop-blur-md');
    });

    it('renders with dark variant', () => {
      const { container } = render(
        <ThemeProvider>
          <Card variant="dark">Content</Card>
        </ThemeProvider>
      );
      const card = container.firstChild;
      expect(card).toHaveClass('backdrop-blur-xl');
    });
  });

  describe('Padding', () => {
    it('applies default medium padding', () => {
      const { container } = render(
        <ThemeProvider>
          <Card>Content</Card>
        </ThemeProvider>
      );
      expect(container.firstChild).toHaveClass('p-5');
    });

    it('applies small padding', () => {
      const { container } = render(
        <ThemeProvider>
          <Card padding="sm">Content</Card>
        </ThemeProvider>
      );
      expect(container.firstChild).toHaveClass('p-3');
    });

    it('applies large padding', () => {
      const { container } = render(
        <ThemeProvider>
          <Card padding="lg">Content</Card>
        </ThemeProvider>
      );
      expect(container.firstChild).toHaveClass('p-8');
    });

    it('applies no padding', () => {
      const { container } = render(
        <ThemeProvider>
          <Card padding="none">Content</Card>
        </ThemeProvider>
      );
      expect(container.firstChild).not.toHaveClass('p-5');
    });
  });

  describe('Hover Effect', () => {
    it('applies hover effect when hover prop is true', () => {
      const { container } = render(
        <ThemeProvider>
          <Card hover>Content</Card>
        </ThemeProvider>
      );
      expect(container.firstChild).toHaveClass('hover:-translate-y-1');
      expect(container.firstChild).toHaveClass('cursor-pointer');
    });

    it('does not apply hover effect by default', () => {
      const { container } = render(
        <ThemeProvider>
          <Card>Content</Card>
        </ThemeProvider>
      );
      expect(container.firstChild).not.toHaveClass('hover:-translate-y-1');
    });
  });

  describe('Compound Components', () => {
    it('renders CardHeader', () => {
      render(
        <ThemeProvider>
          <Card>
            <CardHeader>Header content</CardHeader>
          </Card>
        </ThemeProvider>
      );
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('renders CardTitle with theme text color', () => {
      const { container } = render(
        <ThemeProvider>
          <Card>
            <CardTitle>Title</CardTitle>
          </Card>
        </ThemeProvider>
      );
      const title = screen.getByText('Title');
      expect(title).toHaveClass('text-[var(--color-text-primary)]');
    });

    it('renders CardDescription with theme text color', () => {
      const { container } = render(
        <ThemeProvider>
          <Card>
            <CardDescription>Description</CardDescription>
          </Card>
        </ThemeProvider>
      );
      const description = screen.getByText('Description');
      expect(description).toHaveClass('text-[var(--color-text-secondary)]');
    });

    it('renders CardContent', () => {
      render(
        <ThemeProvider>
          <Card>
            <CardContent>Content</CardContent>
          </Card>
        </ThemeProvider>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders CardFooter with theme border color', () => {
      const { container } = render(
        <ThemeProvider>
          <Card>
            <CardFooter>Footer</CardFooter>
          </Card>
        </ThemeProvider>
      );
      const footer = screen.getByText('Footer').parentElement;
      expect(footer).toHaveClass('border-[var(--color-border)]');
    });

    it('renders complete card structure', () => {
      render(
        <ThemeProvider>
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description</CardDescription>
            </CardHeader>
            <CardContent>Main content</CardContent>
            <CardFooter>Footer content</CardFooter>
          </Card>
        </ThemeProvider>
      );
      
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    let root;

    beforeEach(() => {
      root = document.documentElement;
    });

    afterEach(() => {
      // Clean up CSS variables
      root.style.removeProperty('--color-surface');
      root.style.removeProperty('--color-border');
      root.style.removeProperty('--color-text-primary');
      root.style.removeProperty('--color-text-secondary');
      root.style.removeProperty('--color-background');
    });

    it('uses theme tokens in light mode', () => {
      render(
        <ThemeProvider defaultTheme="light">
          <Card>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </Card>
        </ThemeProvider>
      );

      // Verify CSS variables are set (ThemeProvider sets these)
      const surfaceColor = getComputedStyle(root).getPropertyValue('--color-surface');
      const borderColor = getComputedStyle(root).getPropertyValue('--color-border');
      const textPrimary = getComputedStyle(root).getPropertyValue('--color-text-primary');
      const textSecondary = getComputedStyle(root).getPropertyValue('--color-text-secondary');

      expect(surfaceColor).toBeTruthy();
      expect(borderColor).toBeTruthy();
      expect(textPrimary).toBeTruthy();
      expect(textSecondary).toBeTruthy();
    });

    it('uses theme tokens in dark mode', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <Card>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </Card>
        </ThemeProvider>
      );

      // Verify CSS variables are set for dark mode
      const surfaceColor = getComputedStyle(root).getPropertyValue('--color-surface');
      const borderColor = getComputedStyle(root).getPropertyValue('--color-border');
      const textPrimary = getComputedStyle(root).getPropertyValue('--color-text-primary');
      const textSecondary = getComputedStyle(root).getPropertyValue('--color-text-secondary');

      expect(surfaceColor).toBeTruthy();
      expect(borderColor).toBeTruthy();
      expect(textPrimary).toBeTruthy();
      expect(textSecondary).toBeTruthy();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ThemeProvider>
          <Card className="custom-class">Content</Card>
        </ThemeProvider>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('preserves base styles with custom className', () => {
      const { container } = render(
        <ThemeProvider>
          <Card className="custom-class">Content</Card>
        </ThemeProvider>
      );
      expect(container.firstChild).toHaveClass('rounded-xl');
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Invalid Variant Handling', () => {
    it('falls back to default variant for invalid variant', () => {
      const { container } = render(
        <ThemeProvider>
          <Card variant="invalid">Content</Card>
        </ThemeProvider>
      );
      const card = container.firstChild;
      expect(card).toHaveClass('bg-[var(--color-surface)]');
      expect(card).toHaveClass('border-[var(--color-border)]');
    });
  });
});
