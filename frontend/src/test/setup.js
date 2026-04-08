import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

/**
 * Test Setup
 * 
 * Global test setup for Vitest with:
 * - Jest DOM matchers
 * - Axe-core accessibility testing
 * - Mock implementations
 * - Test environment configuration
 */

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock getComputedStyle
window.getComputedStyle = vi.fn(() => ({
  getPropertyValue: vi.fn(() => ''),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
global.sessionStorage = sessionStorageMock;

// Mock fetch
global.fetch = vi.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  },
  writable: true,
});

// Custom matchers
expect.extend({
  toBeAccessible: (received) => {
    const hasAriaLabels = received.querySelectorAll('[aria-label], [aria-labelledby]').length > 0;
    const hasFocusManagement = received.querySelectorAll('[tabindex]').length > 0;
    const hasSemanticHTML = received.querySelectorAll('main, nav, header, footer, section, article').length > 0;
    
    return {
      pass: hasAriaLabels && hasFocusManagement && hasSemanticHTML,
      message: () => `Expected element to be accessible with proper ARIA attributes and semantic HTML`,
    };
  },
  
  toHaveValidButton: (received) => {
    const hasButtonType = received.hasAttribute('type') || received.tagName === 'BUTTON';
    const hasAccessibleName = received.hasAttribute('aria-label') || 
                           received.hasAttribute('aria-labelledby') || 
                           received.textContent.trim().length > 0;
    
    return {
      pass: hasButtonType && hasAccessibleName,
      message: () => `Expected element to be a valid accessible button`,
    };
  },
  
  toHaveValidForm: (received) => {
    const hasLabels = received.querySelectorAll('label').length > 0;
    const hasInputs = received.querySelectorAll('input, select, textarea').length > 0;
    const hasSubmitButton = received.querySelectorAll('button[type="submit"], input[type="submit"]').length > 0;
    
    return {
      pass: hasLabels && hasInputs && hasSubmitButton,
      message: () => `Expected element to be a valid accessible form`,
    };
  },
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
