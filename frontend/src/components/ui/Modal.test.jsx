import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../theme/ThemeProvider';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './Modal';

describe('Modal', () => {
  const renderWithTheme = (component, theme = 'light') => {
    return render(
      <ThemeProvider defaultTheme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup(); // Prevents lingering components, memory leaks, act() warnings
    localStorage.clear();
    document.body.style.overflow = 'unset';
  });

  describe('Theme Token Integration', () => {
    it('renders with theme tokens in light mode', () => {
      const handleClose = vi.fn();
      
      render(
        <ThemeProvider defaultTheme="light">
          <Modal open onClose={handleClose}>
            <ModalHeader>
              <ModalTitle>Test Modal</ModalTitle>
            </ModalHeader>
            <ModalBody>Modal content</ModalBody>
          </Modal>
        </ThemeProvider>
      );
      
      const title = screen.getByText('Test Modal');
      expect(title).toBeInTheDocument();
      
      // Verify theme token classes are applied
      expect(title.className).toContain('text-[var(--color-text-primary)]');
    });

    it('renders with theme tokens in dark mode', () => {
      const handleClose = vi.fn();
      
      render(
        <ThemeProvider defaultTheme="dark">
          <Modal open onClose={handleClose}>
            <ModalHeader>
              <ModalTitle>Test Modal</ModalTitle>
              <ModalDescription>Test description</ModalDescription>
            </ModalHeader>
          </Modal>
        </ThemeProvider>
      );
      
      const title = screen.getByText('Test Modal');
      const description = screen.getByText('Test description');
      
      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      
      // Verify dark mode is applied
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      
      // Verify theme token classes
      expect(title.className).toContain('text-[var(--color-text-primary)]');
      expect(description.className).toContain('text-[var(--color-text-secondary)]');
    });

    it('renders modal surface with theme background color', () => {
      const handleClose = vi.fn();
      
      const { container } = renderWithTheme(
        <Modal open onClose={handleClose}>
          <ModalBody>Content</ModalBody>
        </Modal>
      );
      
      // Find the modal surface (the div with rounded-xl)
      const modalSurface = container.querySelector('.rounded-xl');
      expect(modalSurface).toBeInTheDocument();
      expect(modalSurface.className).toContain('bg-[var(--color-surface)]');
    });

    it('renders modal header with theme border color', () => {
      const handleClose = vi.fn();
      
      renderWithTheme(
        <Modal open onClose={handleClose}>
          <ModalHeader>
            <ModalTitle>Title</ModalTitle>
          </ModalHeader>
        </Modal>
      );
      
      const header = screen.getByText('Title').parentElement;
      expect(header.className).toContain('border-[var(--color-border)]');
    });

    it('renders modal footer with theme border color', () => {
      const handleClose = vi.fn();
      
      const { container } = renderWithTheme(
        <Modal open onClose={handleClose}>
          <ModalFooter>
            <button>Close</button>
          </ModalFooter>
        </Modal>
      );
      
      const footer = container.querySelector('.border-t');
      expect(footer).toBeInTheDocument();
      expect(footer.className).toContain('border-[var(--color-border)]');
    });

    it('renders close button with theme text colors', () => {
      const handleClose = vi.fn();
      
      const { container } = render(
        <ThemeProvider>
          <Modal open onClose={handleClose} showCloseButton>
            <ModalBody>Content</ModalBody>
          </Modal>
        </ThemeProvider>
      );
      
      const closeButton = container.querySelector('button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.className).toContain('text-[var(--color-text-secondary)]');
      expect(closeButton.className).toContain('hover:text-[var(--color-text-primary)]');
      expect(closeButton.className).toContain('hover:bg-[var(--color-surface)]');
    });
  });

  describe('Basic Functionality', () => {
    it('does not render when open is false', () => {
      const handleClose = vi.fn();
      
      const { container } = renderWithTheme(
        <Modal open={false} onClose={handleClose}>
          <ModalBody>Content</ModalBody>
        </Modal>
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('renders when open is true', () => {
      const handleClose = vi.fn();
      
      renderWithTheme(
        <Modal open onClose={handleClose}>
          <ModalBody>Modal content</ModalBody>
        </Modal>
      );
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      
      const { container } = render(
        <ThemeProvider>
          <Modal open onClose={handleClose} showCloseButton>
            <ModalBody>Content</ModalBody>
          </Modal>
        </ThemeProvider>
      );
      
      const closeButton = container.querySelector('button');
      await user.click(closeButton);
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      
      renderWithTheme(
        <Modal open onClose={handleClose}>
          <ModalBody>Content</ModalBody>
        </Modal>
      );
      
      await user.keyboard('{Escape}');
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders all size variants', () => {
      const sizes = ['sm', 'md', 'lg', 'xl', 'full'];
      const handleClose = vi.fn();
      
      sizes.forEach(size => {
        const { unmount } = render(
          <ThemeProvider>
            <Modal open onClose={handleClose} size={size}>
              <ModalBody>{size}</ModalBody>
            </Modal>
          </ThemeProvider>
        );
        
        expect(screen.getByText(size)).toBeInTheDocument();
        unmount();
      });
    });

    it('hides close button when showCloseButton is false', () => {
      const handleClose = vi.fn();
      
      const { container } = render(
        <ThemeProvider>
          <Modal open onClose={handleClose} showCloseButton={false}>
            <ModalBody>Content</ModalBody>
          </Modal>
        </ThemeProvider>
      );
      
      const closeButton = container.querySelector('button');
      expect(closeButton).toBeNull();
    });
  });

  describe('Compound Components', () => {
    it('renders Modal.Header correctly', () => {
      const handleClose = vi.fn();
      
      render(
        <ThemeProvider>
          <Modal open onClose={handleClose}>
            <ModalHeader>
              <ModalTitle>Header Title</ModalTitle>
            </ModalHeader>
          </Modal>
        </ThemeProvider>
      );
      
      expect(screen.getByText('Header Title')).toBeInTheDocument();
    });

    it('renders Modal.Title correctly', () => {
      const handleClose = vi.fn();
      
      render(
        <ThemeProvider>
          <Modal open onClose={handleClose}>
            <ModalTitle>Title Only</ModalTitle>
          </Modal>
        </ThemeProvider>
      );
      
      const title = screen.getByText('Title Only');
      expect(title.tagName).toBe('H2');
    });

    it('renders Modal.Description correctly', () => {
      const handleClose = vi.fn();
      
      render(
        <ThemeProvider>
          <Modal open onClose={handleClose}>
            <ModalDescription>Description text</ModalDescription>
          </Modal>
        </ThemeProvider>
      );
      
      const description = screen.getByText('Description text');
      expect(description.tagName).toBe('P');
    });

    it('renders Modal.Body correctly', () => {
      const handleClose = vi.fn();
      
      render(
        <ThemeProvider>
          <Modal open onClose={handleClose}>
            <ModalBody>Body content</ModalBody>
          </Modal>
        </ThemeProvider>
      );
      
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('renders Modal.Footer correctly', () => {
      const handleClose = vi.fn();

      render(
        <ThemeProvider>
          <Modal open onClose={handleClose}>
            <ModalFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </ModalFooter>
          </Modal>
        </ThemeProvider>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
  });
});
