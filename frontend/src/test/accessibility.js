import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

/**
 * Accessibility Testing Utilities
 * 
 * Provides helper functions for running axe-core accessibility tests
 * on React components.
 * 
 * Usage:
 * ```jsx
 * import { testAccessibility } from '../test/accessibility';
 * 
 * describe('MyComponent', () => {
 *   testAccessibility(<MyComponent />);
 * });
 * ```
 */

/**
 * Test a component for accessibility violations
 * @param {React.ReactElement} component - Component to test
 * @param {Object} options - Axe options
 */
export const testAccessibility = (component, options = {}) => {
  it('should have no accessibility violations', async () => {
    const { container } = render(component);
    const results = await axe(container, options);
    expect(results).toHaveNoViolations();
  });
};

/**
 * Run axe on a rendered container
 * @param {HTMLElement} container - DOM container
 * @param {Object} options - Axe options
 */
export const runA11yTest = async (container, options = {}) => {
  const results = await axe(container, {
    rules: {
      // Disable color-contrast for now (often requires visual verification)
      'color-contrast': { enabled: false },
      ...options.rules,
    },
    ...options,
  });
  return results;
};

/**
 * Common axe configuration for component tests
 */
export const axeConfig = {
  rules: {
    // Best practice rules
    'accesskeys': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-allowed-role': { enabled: true },
    'aria-command-name': { enabled: true },
    'aria-dialog-name': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-input-field-name': { enabled: true },
    'aria-meter-name': { enabled: true },
    'aria-progressbar-name': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roledescription': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-text': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'aria-tooltip-name': { enabled: true },
    'aria-treeitem-name': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'button-name': { enabled: true },
    'bypass': { enabled: false }, // Skip header/navigation bypass for single components
    'document-title': { enabled: false }, // Component-level only
    'duplicate-id-active': { enabled: true },
    'duplicate-id-aria': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'heading-order': { enabled: true },
    'html-has-lang': { enabled: false }, // Page-level only
    'html-lang-valid': { enabled: false }, // Page-level only
    'image-alt': { enabled: true },
    'input-button-name': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-in-text-block': { enabled: false }, // Requires visual context
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'meta-refresh': { enabled: false }, // Page-level only
    'meta-viewport': { enabled: false }, // Page-level only
    'nested-interactive': { enabled: true },
    'no-redundant-roles': { enabled: true },
    'role-img-alt': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'select-name': { enabled: true },
    'skip-link': { enabled: false }, // Page-level only
    'tabindex': { enabled: true },
    'table-duplicate-name': { enabled: true },
    'table-fake-caption': { enabled: true },
    'target-size': { enabled: false }, // Experimental rule
    'td-has-header': { enabled: true },
    'valid-lang': { enabled: true },
    'aria-conditional-attr': { enabled: true },
    'aria-deprecated-role': { enabled: true },
    'empty-heading': { enabled: true },
    'empty-table-header': { enabled: true },
    'frame-tested': { enabled: false },
    'landmark-unique': { enabled: false }, // Page-level only
    'meta-viewport-large': { enabled: false }, // Page-level only
    'presentation-role-conflict': { enabled: true },
    'region': { enabled: false }, // Page-level only
    'scope-attr-valid': { enabled: true },
  },
};

export default {
  testAccessibility,
  runA11yTest,
  axeConfig,
};
