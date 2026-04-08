import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stack from './Stack';

describe('Stack', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Stack>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </Stack>
      );
      
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });
    
    it('renders with default props', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );
      
      const stack = container.firstChild;
      expect(stack).toHaveClass('flex');
      expect(stack).toHaveClass('flex-col'); // default direction
      expect(stack).toHaveClass('gap-4'); // default spacing (md)
      expect(stack).toHaveClass('items-stretch'); // default align
      expect(stack).toHaveClass('justify-start'); // default justify
      expect(stack).toHaveClass('flex-nowrap'); // default wrap
    });
  });
  
  describe('Direction', () => {
    it('renders vertical direction', () => {
      const { container } = render(
        <Stack direction="vertical">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('flex-col');
    });
    
    it('renders horizontal direction', () => {
      const { container } = render(
        <Stack direction="horizontal">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('flex-row');
    });
    
    it('falls back to vertical for invalid direction', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { container } = render(
        <Stack direction="invalid">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('flex-col');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid direction "invalid"')
      );
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe('Spacing', () => {
    it('renders xs spacing', () => {
      const { container } = render(
        <Stack spacing="xs">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('gap-1');
    });
    
    it('renders sm spacing', () => {
      const { container } = render(
        <Stack spacing="sm">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('gap-2');
    });
    
    it('renders md spacing', () => {
      const { container } = render(
        <Stack spacing="md">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('gap-4');
    });
    
    it('renders lg spacing', () => {
      const { container } = render(
        <Stack spacing="lg">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('gap-6');
    });
    
    it('renders xl spacing', () => {
      const { container } = render(
        <Stack spacing="xl">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('gap-8');
    });
    
    it('falls back to md for invalid spacing', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { container } = render(
        <Stack spacing="invalid">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('gap-4');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid spacing "invalid"')
      );
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe('Align', () => {
    it('renders start alignment', () => {
      const { container } = render(
        <Stack align="start">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('items-start');
    });
    
    it('renders center alignment', () => {
      const { container } = render(
        <Stack align="center">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('items-center');
    });
    
    it('renders end alignment', () => {
      const { container } = render(
        <Stack align="end">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('items-end');
    });
    
    it('renders stretch alignment', () => {
      const { container } = render(
        <Stack align="stretch">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('items-stretch');
    });
    
    it('falls back to stretch for invalid align', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { container } = render(
        <Stack align="invalid">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('items-stretch');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid align "invalid"')
      );
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe('Justify', () => {
    it('renders start justification', () => {
      const { container } = render(
        <Stack justify="start">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('justify-start');
    });
    
    it('renders center justification', () => {
      const { container } = render(
        <Stack justify="center">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('justify-center');
    });
    
    it('renders end justification', () => {
      const { container } = render(
        <Stack justify="end">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('justify-end');
    });
    
    it('renders between justification', () => {
      const { container } = render(
        <Stack justify="between">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('justify-between');
    });
    
    it('renders around justification', () => {
      const { container } = render(
        <Stack justify="around">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('justify-around');
    });
    
    it('falls back to start for invalid justify', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { container } = render(
        <Stack justify="invalid">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('justify-start');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid justify "invalid"')
      );
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
  
  describe('Wrap', () => {
    it('renders without wrap by default', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('flex-nowrap');
    });
    
    it('renders with wrap when wrap=true', () => {
      const { container } = render(
        <Stack wrap={true}>
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('flex-wrap');
    });
    
    it('renders without wrap when wrap=false', () => {
      const { container } = render(
        <Stack wrap={false}>
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('flex-nowrap');
    });
  });
  
  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Stack className="custom-class">
          <div>Child</div>
        </Stack>
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
    
    it('preserves base classes with custom className', () => {
      const { container } = render(
        <Stack className="custom-class">
          <div>Child</div>
        </Stack>
      );
      
      const stack = container.firstChild;
      expect(stack).toHaveClass('flex');
      expect(stack).toHaveClass('custom-class');
    });
  });
  
  describe('Ref forwarding', () => {
    it('forwards ref to div element', () => {
      const ref = { current: null };
      
      render(
        <Stack ref={ref}>
          <div>Child</div>
        </Stack>
      );
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
  
  describe('Combined props', () => {
    it('renders with all props combined', () => {
      const { container } = render(
        <Stack
          direction="horizontal"
          spacing="lg"
          align="center"
          justify="between"
          wrap={true}
          className="custom"
        >
          <div>Child 1</div>
          <div>Child 2</div>
        </Stack>
      );
      
      const stack = container.firstChild;
      expect(stack).toHaveClass('flex');
      expect(stack).toHaveClass('flex-row');
      expect(stack).toHaveClass('gap-6');
      expect(stack).toHaveClass('items-center');
      expect(stack).toHaveClass('justify-between');
      expect(stack).toHaveClass('flex-wrap');
      expect(stack).toHaveClass('custom');
    });
  });
  
  describe('Additional props', () => {
    it('passes through additional props', () => {
      const { container } = render(
        <Stack data-testid="stack" aria-label="Test stack">
          <div>Child</div>
        </Stack>
      );
      
      const stack = container.firstChild;
      expect(stack).toHaveAttribute('data-testid', 'stack');
      expect(stack).toHaveAttribute('aria-label', 'Test stack');
    });
  });
});
