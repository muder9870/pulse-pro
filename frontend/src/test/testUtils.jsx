import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Testing Utilities and Setup
 * 
 * Provides comprehensive testing utilities for the frontend:
 * - Test renderers with providers
 * - Mock data generators
 * - Custom matchers
 * - Test helpers
 */

// Test setup with providers
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

export const AllTheProviders = ({ children, queryClient }) => {
  const testQueryClient = queryClient || createTestQueryClient();
  
  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function
export const renderWithProviders = (ui, options = {}) => {
  const {
    queryClient,
    ...renderOptions
  } = options;

  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} queryClient={queryClient} />,
    ...renderOptions,
  });
};

// Mock data generators
export const generateMockStory = (overrides = {}) => {
  return {
    id: `story-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Sample Story Title',
    content: 'This is a sample story content for testing purposes.',
    score: 85,
    status: 'pending',
    source: 'techcrunch',
    url: 'https://example.com/story',
    publishedAt: new Date().toISOString(),
    tags: ['technology', 'ai', 'innovation'],
    platforms: ['twitter', 'linkedin'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

export const generateMockStories = (count = 5, overrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    generateMockStory({
      ...overrides,
      id: `story-${index}`,
      title: `Story ${index + 1}`,
      score: 60 + Math.floor(Math.random() * 40),
    })
  );
};

export const generateMockPlatform = (overrides = {}) => {
  return {
    id: `platform-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Twitter',
    type: 'social',
    isActive: true,
    config: {
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    },
    ...overrides,
  };
};

export const generateMockPlatforms = (count = 3) => {
  const platforms = ['Twitter', 'LinkedIn', 'Facebook', 'Instagram', 'Reddit'];
  return Array.from({ length: count }, (_, index) =>
    generateMockPlatform({
      id: `platform-${index}`,
      name: platforms[index % platforms.length],
      type: index % 2 === 0 ? 'social' : 'professional',
    })
  );
};

// API mocking utilities
export const createMockApiResponse = (data, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
};

export const createMockFetchResponse = (data, status = 200) => {
  global.fetch = vi.fn(() => createMockApiResponse(data, status));
};

// Custom matchers
export const customMatchers = {
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
};

// Test helpers
export const waitForLoadingToFinish = () => {
  return waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

export const waitForErrorToAppear = () => {
  return waitFor(() => {
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
};

export const clickButtonWithText = async (text) => {
  const button = screen.getByRole('button', { name: new RegExp(text, 'i') });
  await userEvent.click(button);
};

export const fillInputByLabel = async (labelText, value) => {
  const input = screen.getByLabelText(new RegExp(labelText, 'i'));
  await userEvent.clear(input);
  await userEvent.type(input, value);
};

export const selectOptionByLabel = async (labelText, optionText) => {
  const select = screen.getByLabelText(new RegExp(labelText, 'i'));
  await userEvent.selectOptions(select, screen.getByRole('option', { name: new RegExp(optionText, 'i') }));
};

// Component testing utilities
export const testComponentAccessibility = (Component, props = {}) => {
  it('should be accessible', async () => {
    renderWithProviders(<Component {...props} />);
    
    // Check for basic accessibility
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      expect(main).toBeAccessible();
    }
    
    // Test keyboard navigation
    const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusableElements.forEach(element => {
      element.focus();
      expect(element).toHaveFocus();
    });
  });
};

export const testComponentLoading = (Component, props = {}) => {
  it('should show loading state', async () => {
    renderWithProviders(<Component {...props} loading={true} />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
};

export const testComponentError = (Component, props = {}) => {
  it('should show error state', async () => {
    renderWithProviders(<Component {...props} error="Test error" />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });
};

// Integration test helpers
export const setupIntegrationTest = () => {
  const queryClient = createTestQueryClient();
  
  const mockFetch = vi.fn();
  global.fetch = mockFetch;
  
  const user = userEvent.setup();
  
  return {
    queryClient,
    mockFetch,
    user,
    render: (ui) => renderWithProviders(ui, { queryClient }),
  };
};

// Performance testing utilities
export const measureRenderTime = (Component, props = {}, iterations = 10) => {
  const renderTimes = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    renderWithProviders(<Component {...props} />);
    const endTime = performance.now();
    renderTimes.push(endTime - startTime);
  }
  
  const averageTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
  const maxTime = Math.max(...renderTimes);
  const minTime = Math.min(...renderTimes);
  
  return {
    averageTime,
    maxTime,
    minTime,
    renderTimes,
  };
};

// Visual regression testing utilities
export const takeScreenshot = async (element, filename) => {
  // This would integrate with a visual testing library like Percy or Chromatic
  // For now, we'll just log the action
  console.log(`Screenshot taken: ${filename}`);
};

// Test environment setup
export const setupTestEnvironment = () => {
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
  
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  global.localStorage = localStorageMock;
};

// Cleanup utilities
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
};

// Test configuration
export const testConfig = {
  testTimeout: 10000,
  hookTimeout: 5000,
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
};

export default {
  createTestQueryClient,
  AllTheProviders,
  renderWithProviders,
  generateMockStory,
  generateMockStories,
  generateMockPlatform,
  generateMockPlatforms,
  createMockApiResponse,
  createMockFetchResponse,
  customMatchers,
  waitForLoadingToFinish,
  waitForErrorToAppear,
  clickButtonWithText,
  fillInputByLabel,
  selectOptionByLabel,
  testComponentAccessibility,
  testComponentLoading,
  testComponentError,
  setupIntegrationTest,
  measureRenderTime,
  takeScreenshot,
  setupTestEnvironment,
  cleanupTestEnvironment,
  testConfig,
};
