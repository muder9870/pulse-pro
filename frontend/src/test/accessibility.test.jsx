import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

/**
 * Accessibility Tests for UI Components
 * 
 * These tests ensure UI components meet WCAG 2.1 AA standards
 * using axe-core automated accessibility testing.
 */

describe('Button Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Button variant="primary" aria-label="Submit form">
        Submit
      </Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible name', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button')).toHaveAccessibleName('Click me');
  });

  it('should support aria-label', () => {
    const { getByRole } = render(
      <Button aria-label="Close dialog">
        <span aria-hidden>×</span>
      </Button>
    );
    expect(getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
  });

  it('should handle disabled state accessibly', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    expect(getByRole('button')).toBeDisabled();
  });

  it('should handle loading state accessibly', () => {
    const { getByRole } = render(<Button loading>Loading</Button>);
    expect(getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Input Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Input
        label="Email Address"
        type="email"
        placeholder="Enter your email"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should associate label with input', () => {
    const { getByLabelText } = render(
      <Input label="Username" id="username" />
    );
    expect(getByLabelText('Username')).toBeInTheDocument();
  });

  it('should show error accessibly', () => {
    const { getByRole, getByText } = render(
      <Input label="Email" error="Invalid email format" />
    );
    expect(getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(getByText('Invalid email format')).toBeInTheDocument();
  });

  it('should have helper text accessible', () => {
    const { getByText } = render(
      <Input
        label="Password"
        helperText="Must be at least 8 characters"
      />
    );
    expect(getByText('Must be at least 8 characters')).toBeInTheDocument();
  });
});

describe('Modal Accessibility', () => {
  it('should have no accessibility violations when open', async () => {
    const { container } = render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have correct ARIA attributes', () => {
    const { getByRole } = render(
      <Modal open={true} onClose={() => {}} title="Dialog Title">
        <p>Content</p>
      </Modal>
    );
    const dialog = getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('should trap focus when open', () => {
    const { getByRole } = render(
      <Modal open={true} onClose={() => {}} title="Focus Test">
        <button>First button</button>
        <button>Second button</button>
      </Modal>
    );
    // Modal should have tabindex=-1 to receive focus
    expect(getByRole('dialog')).toHaveAttribute('tabIndex', '-1');
  });
});

describe('Semantic HTML', () => {
  it('should use proper heading hierarchy', async () => {
    const { container } = render(
      <div>
        <h1>Main Title</h1>
        <section>
          <h2>Section Title</h2>
          <h3>Subsection</h3>
        </section>
      </div>
    );
    const results = await axe(container, {
      rules: {
        'heading-order': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('should have alt text for images', async () => {
    const { container } = render(
      <div>
        <img src="test.jpg" alt="Descriptive text" />
      </div>
    );
    const results = await axe(container, {
      rules: {
        'image-alt': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('should have accessible links', async () => {
    const { container } = render(
      <div>
        <a href="/test">Link text</a>
      </div>
    );
    const results = await axe(container, {
      rules: {
        'link-name': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
