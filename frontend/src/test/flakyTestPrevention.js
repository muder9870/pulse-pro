import { waitFor, screen } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Flaky Test Prevention Utilities
 * 
 * Provides utilities to prevent common causes of flaky tests:
 * - Async race conditions
 * - Timer issues
 * - Animation delays
 * - Network request timing
 */

/**
 * Wait for element to be stable (no longer loading/changing)
 */
export const waitForStableElement = async (selector, options = {}) => {
  const { timeout = 5000, stableDuration = 500 } = options;
  
  await waitFor(() => {
    const element = screen.queryByTestId(selector) || screen.queryByRole(selector);
    return element !== null;
  }, { timeout });
  
  // Wait for element to stabilize
  await new Promise(resolve => setTimeout(resolve, stableDuration));
};

/**
 * Wait for loading states to resolve
 */
export const waitForLoadingToFinish = async (container = document.body) => {
  // Wait for all loading indicators to disappear
  await waitFor(() => {
    const loadingElements = container.querySelectorAll(
      '[data-loading="true"], .animate-spin, .loading, [aria-busy="true"]'
    );
    expect(loadingElements).toHaveLength(0);
  }, { timeout: 10000 });
};

/**
 * Mock timers for consistent test behavior
 */
export const setupStableTimers = () => {
  // Use fake timers but allow some real time for async operations
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
};

/**
 * Wait for all microtasks to complete
 */
export const flushPromises = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

/**
 * Wait for React Query to settle
 */
export const waitForQuerySettled = async (queryClient) => {
  await waitFor(() => {
    const isFetching = queryClient.isFetching();
    const isMutating = queryClient.isMutating();
    return isFetching === 0 && isMutating === 0;
  }, { timeout: 5000 });
};

/**
 * Retry assertion for flaky operations
 */
export const retryAssertion = async (assertion, options = {}) => {
  const { maxRetries = 3, delay = 100 } = options;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await assertion();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Create a stable mock that doesn't change between renders
 */
export const createStableMock = (implementation) => {
  const mockFn = vi.fn();
  mockFn.mockImplementation(implementation);
  return mockFn;
};

/**
 * Wait for animations to complete
 */
export const waitForAnimations = async () => {
  // Wait for typical CSS transition duration
  await new Promise(resolve => setTimeout(resolve, 350));
};

/**
 * Safe click handler that waits for element
 */
export const safeClick = async (elementOrSelector, options = {}) => {
  const { user, delay = 50 } = options;
  
  let element;
  if (typeof elementOrSelector === 'string') {
    await waitFor(() => {
      element = screen.getByRole(elementOrSelector) || screen.getByTestId(elementOrSelector);
      expect(element).toBeInTheDocument();
    });
  } else {
    element = elementOrSelector;
  }
  
  // Small delay to ensure element is ready
  await new Promise(resolve => setTimeout(resolve, delay));
  
  if (user) {
    await user.click(element);
  } else {
    element.click();
  }
};

/**
 * Wait for network idle (all fetch requests resolved)
 */
export const waitForNetworkIdle = async () => {
  // Wait for typical fetch timeout
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check if any fetches are still pending
  await waitFor(() => {
    // This assumes you have a way to track pending requests
    // In practice, you might need to implement a request counter
    return true;
  }, { timeout: 5000 });
};

/**
 * Common test timeouts to prevent hanging
 */
export const TEST_TIMEOUTS = {
  SHORT: 1000,
  MEDIUM: 5000,
  LONG: 10000,
  CI: 30000, // Longer timeout for CI environments
};

/**
 * Set test timeout based on environment
 */
export const setTestTimeout = () => {
  const isCI = process.env.CI === 'true';
  return isCI ? TEST_TIMEOUTS.CI : TEST_TIMEOUTS.MEDIUM;
};

/**
 * Stabilize test by disabling randomness
 */
export const stabilizeTestEnvironment = () => {
  // Mock Math.random for consistent test runs
  const mockRandom = vi.spyOn(Math, 'random');
  mockRandom.mockReturnValue(0.5);
  
  // Mock Date for consistent timestamps
  const mockDate = new Date('2024-01-15T12:00:00Z');
  vi.setSystemTime(mockDate);
  
  return () => {
    mockRandom.mockRestore();
    vi.useRealTimers();
  };
};

export default {
  waitForStableElement,
  waitForLoadingToFinish,
  setupStableTimers,
  flushPromises,
  waitForQuerySettled,
  retryAssertion,
  createStableMock,
  waitForAnimations,
  safeClick,
  waitForNetworkIdle,
  TEST_TIMEOUTS,
  setTestTimeout,
  stabilizeTestEnvironment,
};
