/**
 * Bug Condition Exploration Tests — Task 1
 * Requirements: 1.1, 1.2, 1.3, 1.4
 *
 * CRITICAL: These tests MUST FAIL on unfixed code.
 * Failure confirms the bug exists. DO NOT fix the code when tests fail.
 *
 * isBugCondition := hasStaleManifest OR hasDualRegistration
 *   hasStaleManifest    = ANY path IN cacheManifest NOT IN actualAssetPaths
 *   hasDualRegistration = swRegistrationCount > 1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

function isBugCondition({ cacheManifest, actualAssetPaths, swRegistrationCount }) {
  return (
    cacheManifest.some(p => !actualAssetPaths.includes(p)) ||
    swRegistrationCount > 1
  );
}

const SW_PATH = path.resolve(__dirname, '../../dist/service-worker.js');
let swSource = '';
try { swSource = fs.readFileSync(SW_PATH, 'utf8'); } catch { swSource = ''; }

function extractCacheManifest(source) {
  const match = source.match(/ASSETS_TO_CACHE\s*=\s*\[([^\]]+)\]/s);
  if (!match) return [];
  return match[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Test 1 — Stale manifest: dist/service-worker.js must not contain unhashed paths
// EXPECTED: FAIL on unfixed code (manifest has /assets/index.js, /assets/index.css)
// ---------------------------------------------------------------------------
describe('Test 1 — Stale SW cache manifest', () => {
  let cacheAddAllMock;

  beforeEach(() => {
    cacheAddAllMock = vi.fn(async (paths) => {
      if (paths.some(p => ['/assets/index.css', '/assets/index.js'].includes(p))) {
        throw new TypeError('Failed to fetch: unhashed path returned 404');
      }
    });
    global.caches = {
      open: vi.fn(async () => ({ addAll: cacheAddAllMock })),
      keys: vi.fn(async () => []),
      delete: vi.fn(async () => true),
    };
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('Fixed SW has no ASSETS_TO_CACHE — no stale manifest to cause 404s', async () => {
    expect(swSource, 'dist/service-worker.js must exist').not.toBe('');
    const manifest = extractCacheManifest(swSource);

    // On fixed code: ASSETS_TO_CACHE is gone — manifest is empty, no addAll() call, no 404s
    expect(manifest.length, 'Fixed SW must have no ASSETS_TO_CACHE (pass-through SW caches nothing)').toBe(0);

    // Verify the fixed SW does not call cache.addAll() with any paths
    expect(swSource, 'Fixed SW must not contain cache.addAll()').not.toMatch(/cache\.addAll\s*\(/);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Dual registration: useOffline.js must not call register()
// EXPECTED: FAIL on unfixed code (register call is present)
// ---------------------------------------------------------------------------
describe('Test 2 — Dual SW registration', () => {
  const USE_OFFLINE_PATH = path.resolve(__dirname, '../hooks/useOffline.js');
  let useOfflineSource = '';
  try { useOfflineSource = fs.readFileSync(USE_OFFLINE_PATH, 'utf8'); } catch { useOfflineSource = ''; }

  it('useOffline.js must not contain navigator.serviceWorker.register() (counterexample: dual registration)', () => {
    expect(useOfflineSource, 'useOffline.js must exist').not.toBe('');
    // On unfixed code this FAILS — file contains navigator.serviceWorker.register('/sw.js')
    expect(
      useOfflineSource,
      'useOffline.js must not register a SW (causes dual registration with index.html)'
    ).not.toMatch(/navigator\.serviceWorker\.register\s*\(/);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Asset load: fixed pass-through SW must not block hashed asset requests
// EXPECTED: PASS on fixed code (SW is pass-through — no caching, no interception)
// ---------------------------------------------------------------------------
describe('Test 3 — Asset load with fixed pass-through SW', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('Fixed SW is pass-through — no ASSETS_TO_CACHE means no broken cache interception', () => {
    // The fixed SW has no ASSETS_TO_CACHE and no cache.addAll() call.
    // It passes all fetch events through to the network.
    // Verify the fixed SW source does not intercept or cache any asset paths.
    expect(swSource, 'dist/service-worker.js must exist').not.toBe('');

    // Fixed SW must not contain ASSETS_TO_CACHE (no stale manifest)
    expect(swSource, 'Fixed SW must not have ASSETS_TO_CACHE').not.toMatch(/ASSETS_TO_CACHE/);

    // Fixed SW must not contain CACHE_NAME (no cache to collide with)
    expect(swSource, 'Fixed SW must not have CACHE_NAME').not.toMatch(/CACHE_NAME/);

    // Fixed SW must pass all requests through (respondWith(fetch(e.request)))
    expect(swSource, 'Fixed SW must pass requests through to network').toMatch(/respondWith\s*\(\s*fetch\s*\(\s*e\.request\s*\)\s*\)/);
  });
});
