/**
 * Dev Error Clarity Test — Requirement 2.5
 *
 * Verifies that vite.config.js does NOT hardcode process.env.NODE_ENV to "production".
 * When this define is absent, Vite uses the --mode flag to set NODE_ENV, so:
 *   - `npm run dev`   → NODE_ENV = "development" → React uses full error messages
 *   - `npm run build` → NODE_ENV = "production"  → React uses minified errors
 *
 * With the define removed, `npm run dev` will show:
 *   "Element type is invalid: expected a string (for built-in components) or a
 *    class/function (for composite components) but got: undefined.
 *    Check the render method of `App`."
 * instead of the opaque "Minified React error #130".
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const VITE_CONFIG = path.resolve(__dirname, '../../vite.config.js');
const source = fs.readFileSync(VITE_CONFIG, 'utf8');

describe('Requirement 2.5 — Dev mode shows non-minified React errors', () => {
  it('vite.config.js must not hardcode process.env.NODE_ENV — Req 2.5', () => {
    expect(source).not.toMatch(/['"]process\.env\.NODE_ENV['"]/);
  });

  it('vite.config.js must not contain a define block that forces production mode — Req 2.5', () => {
    // The define block was: define: { 'process.env.NODE_ENV': '"production"' }
    // Its removal means Vite will derive NODE_ENV from --mode (development in dev, production in build)
    expect(source).not.toMatch(/["']production["']/);
  });

  it('vite.config.js has no define block at all — Req 2.5', () => {
    expect(source).not.toMatch(/\bdefine\s*:/);
  });

  it('React dev bundle will be used in dev mode (non-minified errors) — Req 2.5', () => {
    // React chooses its bundle based on NODE_ENV at build/serve time.
    // Without the forced define, `npm run dev` sets NODE_ENV=development,
    // which loads react/cjs/react.development.js — the bundle with full error messages.
    // We verify this indirectly: no forced production define means dev mode is real dev mode.
    const hasForceProduction = /['"]process\.env\.NODE_ENV['"]\s*:\s*['"](production|"production")['"]/
      .test(source);
    expect(hasForceProduction).toBe(false);
  });
});
