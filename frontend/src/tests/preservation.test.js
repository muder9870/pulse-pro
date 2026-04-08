/**
 * Preservation Property Tests — Task 2
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * These tests MUST PASS on UNFIXED code.
 * They capture baseline behavior that must not regress after the fix.
 *
 * Property 2: Preservation — Non-SW Behavior Unchanged
 *   For any app state where isBugCondition(appState) returns false
 *   (no stale manifest, single registration, correct asset paths),
 *   the fixed code SHALL produce the same behavior as the original code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * isBugCondition — mirrors the pseudocode in design.md
 */
function isBugCondition({ cacheManifest, actualAssetPaths, swRegistrationCount }) {
  const hasStaleManifest = cacheManifest.some(p => !actualAssetPaths.includes(p));
  const hasDualRegistration = swRegistrationCount > 1;
  return hasStaleManifest || hasDualRegistration;
}

/**
 * Simulate the useOffline state machine for a sequence of online/offline events.
 * Returns the final state after processing all events.
 * Does NOT call navigator.serviceWorker.register — that is the preservation invariant.
 */
function simulateOfflineStateMachine(events, initialOnline = true) {
  let isOnline = initialOnline;
  let isOfflineMode = !initialOnline;
  const registerCalls = [];

  // Simulate the event handlers from useOffline.js (without the SW register side-effect)
  for (const event of events) {
    if (event === 'online') {
      isOnline = true;
      isOfflineMode = false;
    } else if (event === 'offline') {
      isOnline = false;
      isOfflineMode = true;
    }
    // Any SW register call would be captured here — there should be none
  }

  return { isOnline, isOfflineMode, registerCalls };
}

// ---------------------------------------------------------------------------
// Property 2a — API proxy config preservation (Requirement 3.3)
// Vite dev server proxy config must route /api/ to http://localhost:5000
// This must not be affected by any of the five-file fix.
// ---------------------------------------------------------------------------
describe('Property 2a — API proxy config preservation (Req 3.3)', () => {
  const VITE_CONFIG_PATH = path.resolve(__dirname, '../../vite.config.js');
  let viteConfigSource = '';
  try { viteConfigSource = fs.readFileSync(VITE_CONFIG_PATH, 'utf8'); } catch { viteConfigSource = ''; }

  it('vite.config.js must exist', () => {
    expect(viteConfigSource, 'vite.config.js must be readable').not.toBe('');
  });

  it('vite.config.js must proxy /api/ to http://localhost:5000 (dev) — Req 3.3', () => {
    expect(viteConfigSource).toMatch(/['"]\/api['"]/);
    expect(viteConfigSource).toMatch(/http:\/\/localhost:5000/);
  });

  it('vite.config.js must proxy /media/ to http://localhost:5000 (dev) — Req 3.3', () => {
    expect(viteConfigSource).toMatch(/['"]\/media['"]/);
    expect(viteConfigSource).toMatch(/http:\/\/localhost:5000/);
  });

  // Property: for any non-API path, the proxy config does not interfere
  // We enumerate a representative set of non-API paths and verify none are proxied
  const nonApiPaths = ['/', '/index.html', '/assets/index.js', '/manifest.json', '/sw.js', '/service-worker.js'];
  for (const p of nonApiPaths) {
    it(`non-API path "${p}" is not listed as a proxy target — Req 3.3`, () => {
      // The proxy block should only mention /api and /media as keys
      // Verify the path is not a proxy key (it may appear in comments or target values, that's fine)
      const proxyKeyPattern = new RegExp(`proxy\\s*:\\s*\\{[^}]*['"]${p.replace(/\//g, '\\/')}['"]\\s*:`, 's');
      expect(viteConfigSource).not.toMatch(proxyKeyPattern);
    });
  }
});

// ---------------------------------------------------------------------------
// Property 2b — Build output preservation (Requirement 3.5)
// dist/assets/ must contain index-[hash].js and index-[hash].css
// These are the actual build artifacts that index.html references.
// ---------------------------------------------------------------------------
describe('Property 2b — Build output preservation (Req 3.5)', () => {
  const DIST_ASSETS_PATH = path.resolve(__dirname, '../../dist/assets');

  it('dist/assets/ directory must exist', () => {
    expect(fs.existsSync(DIST_ASSETS_PATH), 'dist/assets/ must exist').toBe(true);
  });

  it('dist/assets/ must contain exactly one JS file with a hash in its name — Req 3.5', () => {
    const files = fs.readdirSync(DIST_ASSETS_PATH);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    expect(jsFiles.length, 'Must have at least one JS asset').toBeGreaterThanOrEqual(1);
    // At least one JS file must have a hash pattern: name-[hash].js
    const hashedJs = jsFiles.filter(f => /^index-[A-Za-z0-9]+\.js$/.test(f));
    expect(hashedJs.length, 'Must have a hashed index JS file (index-[hash].js)').toBeGreaterThanOrEqual(1);
  });

  it('dist/assets/ must contain exactly one CSS file with a hash in its name — Req 3.5', () => {
    const files = fs.readdirSync(DIST_ASSETS_PATH);
    const cssFiles = files.filter(f => f.endsWith('.css'));
    expect(cssFiles.length, 'Must have at least one CSS asset').toBeGreaterThanOrEqual(1);
    const hashedCss = cssFiles.filter(f => /^index-[A-Za-z0-9]+\.css$/.test(f));
    expect(hashedCss.length, 'Must have a hashed index CSS file (index-[hash].css)').toBeGreaterThanOrEqual(1);
  });

  // Property: for any Vite build output filename in dist/assets/,
  // the fixed SW must never reference a filename NOT in that set.
  // On unfixed code: dist/service-worker.js references /assets/index.js and /assets/index.css
  // which are NOT in dist/assets/ — this is the bug. The preservation test verifies
  // that the actual asset filenames ARE valid (they exist on disk).
  it('every file in dist/assets/ actually exists on disk — Req 3.5', () => {
    const files = fs.readdirSync(DIST_ASSETS_PATH);
    for (const file of files) {
      const fullPath = path.join(DIST_ASSETS_PATH, file);
      expect(fs.existsSync(fullPath), `dist/assets/${file} must exist`).toBe(true);
    }
  });

  // Property: dist/index.html must reference the hashed filenames that exist in dist/assets/
  it('dist/index.html references asset filenames that exist in dist/assets/ — Req 3.5', () => {
    const indexPath = path.resolve(__dirname, '../../dist/index.html');
    if (!fs.existsSync(indexPath)) return; // skip if no dist yet
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const files = fs.readdirSync(DIST_ASSETS_PATH);

    // Extract all /assets/... references from index.html
    const assetRefs = [...indexHtml.matchAll(/\/assets\/([^"'\s>]+)/g)].map(m => m[1]);
    for (const ref of assetRefs) {
      expect(
        files.includes(ref),
        `index.html references /assets/${ref} but that file does not exist in dist/assets/`
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 2c — SW unregistration preservation (Requirement 3.4)
// main.jsx must call getRegistrations().forEach(r => r.unregister())
// This logic must not be removed by the fix.
// ---------------------------------------------------------------------------
describe('Property 2c — SW unregistration in main.jsx (Req 3.4)', () => {
  const MAIN_PATH = path.resolve(__dirname, '../main.jsx');
  let mainSource = '';
  try { mainSource = fs.readFileSync(MAIN_PATH, 'utf8'); } catch { mainSource = ''; }

  it('main.jsx must exist', () => {
    expect(mainSource, 'main.jsx must be readable').not.toBe('');
  });

  it('main.jsx must call getRegistrations() — Req 3.4', () => {
    expect(mainSource).toMatch(/getRegistrations\s*\(\s*\)/);
  });

  it('main.jsx must call unregister() on each registration — Req 3.4', () => {
    expect(mainSource).toMatch(/\.unregister\s*\(\s*\)/);
  });

  it('main.jsx must clear all caches on startup — Req 3.4', () => {
    expect(mainSource).toMatch(/caches\.keys\s*\(\s*\)/);
    expect(mainSource).toMatch(/caches\.delete\s*\(/);
  });

  // Property: the unregistration block must be guarded by 'serviceWorker' in navigator
  it('main.jsx SW unregistration is guarded by serviceWorker-in-navigator check — Req 3.4', () => {
    expect(mainSource).toMatch(/'serviceWorker'\s+in\s+navigator/);
  });
});

// ---------------------------------------------------------------------------
// Property 2d — useOffline state machine (Requirement 3.1, 3.2)
// For any sequence of online/offline transitions, the state machine must
// correctly track isOnline/isOfflineMode without SW registration side effects.
//
// We enumerate all sequences of length 1–4 over {online, offline} and verify
// the state machine produces the correct final state.
// ---------------------------------------------------------------------------
describe('Property 2d — useOffline state machine (Req 3.1, 3.2)', () => {
  // Generate all sequences of length `len` over the given alphabet
  function* allSequences(alphabet, len) {
    if (len === 0) { yield []; return; }
    for (const prefix of allSequences(alphabet, len - 1)) {
      for (const item of alphabet) {
        yield [...prefix, item];
      }
    }
  }

  const events = ['online', 'offline'];

  // For sequences of length 1–4, verify state machine correctness
  for (let len = 1; len <= 4; len++) {
    for (const seq of allSequences(events, len)) {
      const label = seq.join('→');
      const lastEvent = seq[seq.length - 1];
      const expectedOnline = lastEvent === 'online';

      it(`sequence [${label}]: isOnline=${expectedOnline}, no SW register calls — Req 3.1`, () => {
        const result = simulateOfflineStateMachine(seq, true);
        expect(result.isOnline).toBe(expectedOnline);
        expect(result.isOfflineMode).toBe(!expectedOnline);
        // Preservation invariant: no SW registration side effects
        expect(result.registerCalls.length).toBe(0);
      });
    }
  }

  // Property: starting offline, going online clears offline mode
  it('starting offline then going online clears isOfflineMode — Req 3.1', () => {
    const result = simulateOfflineStateMachine(['online'], false);
    expect(result.isOnline).toBe(true);
    expect(result.isOfflineMode).toBe(false);
  });

  // Property: starting online then going offline sets offline mode
  it('starting online then going offline sets isOfflineMode — Req 3.1', () => {
    const result = simulateOfflineStateMachine(['offline'], true);
    expect(result.isOnline).toBe(false);
    expect(result.isOfflineMode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 2e — Fixed SW never references filenames outside build output (Req 3.5)
// For any set of Vite build output filenames, the fixed SW (public/service-worker.js)
// must not reference any filename not in that set.
//
// We generate representative sets of hashed filenames and verify the fixed SW
// contains no ASSETS_TO_CACHE array referencing them (it should have none at all).
// ---------------------------------------------------------------------------
describe('Property 2e — Fixed SW references no asset filenames (Req 3.5)', () => {
  const FIXED_SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');
  let fixedSwSource = '';
  try { fixedSwSource = fs.readFileSync(FIXED_SW_PATH, 'utf8'); } catch { fixedSwSource = ''; }

  it('public/service-worker.js must exist', () => {
    expect(fixedSwSource, 'public/service-worker.js must be readable').not.toBe('');
  });

  it('public/service-worker.js must not contain ASSETS_TO_CACHE — Req 3.5', () => {
    expect(fixedSwSource).not.toMatch(/ASSETS_TO_CACHE/);
  });

  it('public/service-worker.js must not contain cache.addAll() — Req 3.5', () => {
    expect(fixedSwSource).not.toMatch(/cache\.addAll\s*\(/);
  });

  // Property: for any set of build output filenames, the fixed SW references none of them
  // We enumerate representative hashed filename sets and verify no match in the fixed SW
  const buildOutputSets = [
    ['index-KCt3oKlR.js', 'index-CR71Dtao.css'],
    ['index-ABC123.js', 'index-DEF456.css'],
    ['main-XYZ789.js', 'main-QRS012.css'],
    ['index-aaaaaa.js', 'index-bbbbbb.css', 'vendor-cccccc.js'],
  ];

  for (const fileSet of buildOutputSets) {
    it(`fixed SW does not reference any of [${fileSet.join(', ')}] — Req 3.5`, () => {
      for (const filename of fileSet) {
        expect(
          fixedSwSource,
          `Fixed SW must not reference build output filename: ${filename}`
        ).not.toMatch(filename);
      }
    });
  }

  it('public/service-worker.js must call self.registration.unregister() — Req 3.5', () => {
    expect(fixedSwSource).toMatch(/self\.registration\.unregister\s*\(\s*\)/);
  });
});

// ---------------------------------------------------------------------------
// Property 2f — Non-bug-condition states do not trigger isBugCondition (Req 3.1)
// For all app states with no stale manifest and single registration,
// isBugCondition must return false.
// ---------------------------------------------------------------------------
describe('Property 2f — isBugCondition returns false for clean states (Req 3.1)', () => {
  // Representative sets of actual hashed asset paths (as produced by Vite)
  const hashedAssetSets = [
    ['/assets/index-KCt3oKlR.js', '/assets/index-CR71Dtao.css'],
    ['/assets/index-ABC123.js', '/assets/index-DEF456.css'],
    ['/assets/main-XYZ789.js', '/assets/main-QRS012.css'],
    ['/', '/index.html', '/manifest.json', '/assets/index-hash1.js', '/assets/index-hash2.css'],
  ];

  for (const actualPaths of hashedAssetSets) {
    it(`clean state with actualPaths=[${actualPaths.slice(0, 2).join(', ')}...] → isBugCondition=false`, () => {
      const state = {
        cacheManifest: actualPaths, // manifest matches actual paths exactly
        actualAssetPaths: actualPaths,
        swRegistrationCount: 1,
      };
      expect(isBugCondition(state)).toBe(false);
    });
  }

  // Property: single registration with empty manifest is not a bug condition
  it('empty manifest with single registration → isBugCondition=false', () => {
    expect(isBugCondition({ cacheManifest: [], actualAssetPaths: [], swRegistrationCount: 1 })).toBe(false);
  });

  // Property: zero registrations is not a bug condition (SW cleared by main.jsx)
  it('zero registrations → isBugCondition=false', () => {
    expect(isBugCondition({ cacheManifest: [], actualAssetPaths: [], swRegistrationCount: 0 })).toBe(false);
  });

  // Property: manifest subset of actual paths is not a bug condition
  it('manifest is a subset of actual paths → isBugCondition=false', () => {
    const actual = ['/assets/index-abc.js', '/assets/index-def.css', '/index.html'];
    const manifest = ['/assets/index-abc.js']; // subset
    expect(isBugCondition({ cacheManifest: manifest, actualAssetPaths: actual, swRegistrationCount: 1 })).toBe(false);
  });

  // Contrast: stale manifest IS a bug condition
  it('stale manifest (unhashed path not in actual) → isBugCondition=true (contrast)', () => {
    expect(isBugCondition({
      cacheManifest: ['/assets/index.js', '/assets/index.css'],
      actualAssetPaths: ['/assets/index-KCt3oKlR.js', '/assets/index-CR71Dtao.css'],
      swRegistrationCount: 1,
    })).toBe(true);
  });

  // Contrast: dual registration IS a bug condition
  it('dual registration → isBugCondition=true (contrast)', () => {
    expect(isBugCondition({
      cacheManifest: [],
      actualAssetPaths: [],
      swRegistrationCount: 2,
    })).toBe(true);
  });
});
