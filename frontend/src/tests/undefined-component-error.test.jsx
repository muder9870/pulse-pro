/**
 * Undefined Component Error Clarity Test — Requirement 2.5
 *
 * Simulates what happens in `npm run dev` when a component is undefined.
 * Renders an undefined component via React and captures the thrown error.
 *
 * BEFORE fix: NODE_ENV was forced to "production" → React threw "Minified React error #130"
 * AFTER fix:  NODE_ENV is "test" (vitest) / "development" (dev server) →
 *             React throws the full verbose message with component name.
 *
 * This test proves the non-minified error path is active.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Suppress the expected console.error output from React's error boundary
import { vi, beforeAll, afterAll } from 'vitest';

describe('Requirement 2.5 — Non-minified React error when component is undefined', () => {
  let consoleError;

  beforeAll(() => {
    // Suppress React's error output to keep test output clean
    consoleError = console.error;
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = consoleError;
  });

  it('renders undefined component → throws verbose error, NOT minified #130', () => {
    // Simulate: import Broken from './DoesNotExist' → resolves to undefined
    const Broken = undefined;

    // React.createElement with undefined type throws synchronously during render
    let caughtError = null;
    try {
      render(React.createElement(Broken));
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError, 'React must throw when rendering undefined component').not.toBeNull();

    const msg = caughtError.message;

    // The non-minified error message (development / test mode)
    expect(msg).toMatch(/Element type is invalid/i);
    expect(msg).toMatch(/expected a string.*or a class\/function/i);
    expect(msg).toMatch(/got: undefined/i);

    // Must NOT be the minified production error
    expect(msg).not.toMatch(/Minified React error #130/);
    expect(msg).not.toMatch(/react\.min\.js/);
  });

  it('NODE_ENV is not "production" in this environment — confirms dev error path is active', () => {
    // In vitest, NODE_ENV = "test". In `npm run dev`, NODE_ENV = "development".
    // Both are non-production, so React uses the full error bundle.
    // The only way to get minified errors is if NODE_ENV is forced to "production" —
    // which we removed from vite.config.js.
    expect(process.env.NODE_ENV).not.toBe('production');
  });
});
