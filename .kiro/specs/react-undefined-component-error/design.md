# React Undefined Component Error Bugfix Design

## Overview

The production Docker build throws "Minified React error #130" because the JS bundle never loads successfully. The root cause is a three-way compounding failure: `dist/service-worker.js` hardcodes unhashed asset paths that don't exist in the Vite build output, a second SW (`/sw.js`) is registered programmatically by `useOffline.js` in parallel with the inline registration in `index.html`, and `vite.config.js` hardcodes `process.env.NODE_ENV: "production"` which suppresses non-minified React error messages in development.

The fix strategy is: (1) replace the static cache manifest in `service-worker.js` with a pass-through SW that does no asset caching, (2) remove the duplicate SW registration from `useOffline.js`, and (3) remove the hardcoded `NODE_ENV` define from `vite.config.js`.

## Glossary

- **Bug_Condition (C)**: The set of conditions that collectively cause the React error #130 — specifically: a stale or broken SW is active AND the JS bundle fails to load
- **Property (P)**: The desired outcome — the React app renders without error, all assets load with HTTP 200, and exactly one SW is active
- **Preservation**: Existing behaviors that must not regress — online API proxying, Vite build output, nginx routing, and the SW unregistration logic in `main.jsx`
- **isBugCondition**: Pseudocode predicate that returns true when the bug is present
- **service-worker.js**: The SW at `frontend/dist/service-worker.js` (and `frontend/public/service-worker.js`) that contains the broken static cache manifest
- **sw.js**: The second SW at `frontend/dist/sw.js` (and `frontend/public/sw.js`) registered by `useOffline.js`
- **pulse-pro-v1**: The shared cache name used by both SWs, causing cache collisions
- **ASSETS_TO_CACHE**: The hardcoded array in `dist/service-worker.js` containing `/assets/index.css` and `/assets/index.js` — paths that do not exist after a Vite content-hashed build

## Bug Details

### Bug Condition

The bug manifests when all three conditions are simultaneously true:
1. A service worker from a previous session is active (or installs fresh) with the broken `dist/service-worker.js`
2. The SW's `cache.addAll()` references `/assets/index.js` and `/assets/index.css` which return 404 (Vite produces `/assets/index-[hash].js` and `/assets/index-[hash].css`)
3. The SW intercepts the browser's request for the hashed asset filenames, finds no cache match, and the network fetch either fails or returns a corrupt response

**Formal Specification:**
```
FUNCTION isBugCondition(appState)
  INPUT: appState with fields:
    - activeSwScript: string (URL of the active service worker script)
    - cacheManifest: string[] (paths listed in ASSETS_TO_CACHE)
    - actualAssetPaths: string[] (paths produced by Vite build)
    - swRegistrationCount: number (number of active SW registrations)
  OUTPUT: boolean

  hasStaleManifest := ANY path IN cacheManifest WHERE path NOT IN actualAssetPaths
  hasDualRegistration := swRegistrationCount > 1

  RETURN hasStaleManifest OR hasDualRegistration
END FUNCTION
```

### Examples

- **Stale manifest (primary)**: `cache.addAll(['/assets/index.css', '/assets/index.js'])` is called during SW install. Vite produced `/assets/index-CR71Dtao.css` and `/assets/index-KCt3oKlR.js`. Both 404. SW install fails. Browser has no JS bundle. React error #130.
- **Dual SW race**: `index.html` registers `/service-worker.js` on `window load`. `useOffline.js` registers `/sw.js` on component mount. Both use cache name `pulse-pro-v1`. The second SW's activate event deletes caches the first SW just populated, leaving the page with no cached assets mid-session.
- **Dev mode suppression**: `vite.config.js` defines `process.env.NODE_ENV: "production"` unconditionally. Running `npm run dev` still shows minified error #130 instead of "Element type is invalid: expected a string... but got: undefined. Check the render method of `App`." — making the root cause invisible.
- **Edge case — fresh install, no prior SW**: Even without a stale SW, the `dist/service-worker.js` installs fresh and immediately fails `cache.addAll()` because the unhashed paths don't exist, putting the SW in a broken state on first load.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse/touch interactions and all UI views (Analytics, Calendar, Media, Research, Podcast, Settings) must continue to work exactly as before
- `main.jsx` SW unregistration logic must continue to clear stale registrations on startup (requirement 3.4)
- `nginx.conf` proxying of `/api/` to `http://backend:5000` must remain unchanged (requirement 3.3)
- `npm run build` must continue to produce a single `index-[hash].js` and `index-[hash].css` in `/dist/assets/` (requirement 3.5)
- Online story fetching and pipeline execution must remain unaffected (requirement 3.2)

**Scope:**
All inputs that do NOT involve service worker asset caching or the `NODE_ENV` define are completely unaffected by this fix. This includes:
- All React component rendering logic
- All API route handlers and backend code
- All nginx proxy configuration
- All Vite build pipeline configuration except the `define` block

## Hypothesized Root Cause

Based on the bug description and source inspection:

1. **Hardcoded unhashed paths in `dist/service-worker.js`**: `ASSETS_TO_CACHE` contains `/assets/index.css` and `/assets/index.js`. Vite's `rollupOptions` in `vite.config.js` currently strips hashes (`[name].js`, `[name].[ext]`), but the actual output filenames in `dist/index.html` are `index-KCt3oKlR.js` and `index-CR71Dtao.css` — meaning the rollup config itself may not be applying correctly, or the `dist/` files are from a different build run. Either way, the SW manifest is wrong.

2. **Dual SW registration with shared cache name**: `dist/index.html` registers `/service-worker.js` inline. `useOffline.js` registers `/sw.js` programmatically. Both SWs use `CACHE_NAME = 'pulse-pro-v1'`. The activate handler in `dist/service-worker.js` deletes all caches not matching `pulse-pro-v1`, which can wipe the other SW's cache mid-session.

3. **`vite.config.js` hardcoded `process.env.NODE_ENV: "production"`**: This define is applied at build time AND dev server time. During `npm run dev`, React sees `NODE_ENV === "production"` and uses the minified error bundle, hiding the exact component name that is undefined.

4. **`public/` SW files are already fixed but `dist/` files are stale**: `frontend/public/service-worker.js` and `frontend/public/sw.js` both contain the "Disabled — immediately unregister" implementation. However, `frontend/dist/service-worker.js` still contains the broken cache manifest. The `dist/` directory appears to be a stale build artifact that was committed to the repo and is being served directly by Docker/nginx instead of being regenerated.

## Correctness Properties

Property 1: Bug Condition - Asset Loading Succeeds After SW Fix

_For any_ app state where `isBugCondition(appState)` returns true (stale SW cache manifest or dual SW registration), the fixed configuration SHALL result in all JS and CSS assets loading with HTTP 200, no `net::ERR_ABORTED` errors, and the React application rendering without error #130.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-SW Behavior Unchanged

_For any_ app state where `isBugCondition(appState)` returns false (no stale SW, single registration, correct asset paths), the fixed code SHALL produce exactly the same behavior as the original code, preserving all API proxying, build output, nginx routing, and UI rendering behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `frontend/public/service-worker.js` (already fixed — verify it matches `dist/`)

**File 2**: `frontend/dist/service-worker.js`

**Specific Changes**:
1. **Replace broken cache manifest SW with pass-through SW**: Replace the entire content of `dist/service-worker.js` with the same "Disabled — immediately unregister" implementation already present in `public/service-worker.js`. This eliminates the `cache.addAll()` call with unhashed paths.

**File 3**: `frontend/dist/sw.js`

2. **Align `dist/sw.js` with `public/sw.js`**: Replace `dist/sw.js` with the same "Disabled — immediately unregister" implementation. The `dist/` directory should not contain stale SW files that differ from `public/`.

**File 4**: `frontend/src/hooks/useOffline.js`

3. **Remove programmatic SW registration**: Delete the `navigator.serviceWorker.register('/sw.js')` call from the `useEffect` in `useOffline.js`. The hook can still use `navigator.serviceWorker.ready` to detect SW readiness, but must not register a second SW. SW registration is already handled (and intentionally cleared) by `main.jsx`.

**File 5**: `frontend/vite.config.js`

4. **Remove hardcoded `NODE_ENV` define**: Delete the `'process.env.NODE_ENV': '"production"'` line from the `define` block. Vite sets `NODE_ENV` correctly based on the `--mode` flag. Keep the `VITE_ENABLE_SW` define if it is used elsewhere, or remove it too if unused.

5. **Fix or remove `rollupOptions` filename pattern**: The current `rollupOptions` sets `entryFileNames: 'assets/[name].js'` (no hash), but `dist/index.html` references hashed filenames. Either add `[hash]` to the pattern (`assets/[name]-[hash].js`) or remove the `rollupOptions` override entirely to use Vite defaults, then rebuild so `dist/` is consistent.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate SW install with the broken cache manifest and assert that `cache.addAll()` fails when the unhashed paths are not present. Also write tests that simulate dual SW registration and assert that cache state becomes inconsistent. Run these tests on the UNFIXED `dist/service-worker.js` to observe failures.

**Test Cases**:
1. **Stale manifest install test**: Mock `cache.addAll()` with a fetch handler that returns 404 for `/assets/index.js` and `/assets/index.css`. Assert that the SW install event rejects. (will fail on unfixed `dist/service-worker.js`)
2. **Dual registration cache collision test**: Register both `/service-worker.js` and `/sw.js` in a test environment. Assert that after both activate, the cache named `pulse-pro-v1` contains the expected entries. (will fail — one SW's activate wipes the other's cache)
3. **Asset load test**: Simulate a page load with the broken SW active. Assert that requests for `/assets/index-KCt3oKlR.js` return a valid response. (will fail — SW has no cache entry and the unhashed fallback doesn't exist)
4. **Dev mode error clarity test**: With `NODE_ENV` hardcoded to `"production"`, assert that a render error for an undefined component produces a non-minified message. (will fail — minified error #130 is shown instead)

**Expected Counterexamples**:
- `cache.addAll()` rejects with a `TypeError: Failed to fetch` for the unhashed asset paths
- Possible causes: paths don't exist in build output, SW manifest was written manually and not regenerated after Vite build

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed configuration produces the expected behavior.

**Pseudocode:**
```
FOR ALL appState WHERE isBugCondition(appState) DO
  result := loadApp_fixed(appState)
  ASSERT result.reactError === null
  ASSERT result.assetLoadErrors.length === 0
  ASSERT result.activeSwCount === 1
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL appState WHERE NOT isBugCondition(appState) DO
  ASSERT loadApp_original(appState) = loadApp_fixed(appState)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for online API calls, nginx proxying, and UI rendering, then write property-based tests capturing that behavior.

**Test Cases**:
1. **API proxy preservation**: Verify that `/api/` requests continue to be proxied to `http://backend:5000` after removing the `NODE_ENV` define
2. **Build output preservation**: Verify that `npm run build` still produces `dist/assets/index-[hash].js` and `dist/assets/index-[hash].css` after fixing `rollupOptions`
3. **SW unregistration preservation**: Verify that `main.jsx`'s `getRegistrations().forEach(r => r.unregister())` still runs and clears all SW registrations on startup
4. **UI rendering preservation**: Verify that all dashboard views render correctly after the SW and `NODE_ENV` fixes

### Unit Tests

- Test that the fixed `service-worker.js` install event does not call `cache.addAll()` with any asset paths
- Test that `useOffline.js` no longer calls `navigator.serviceWorker.register()` after the fix
- Test that `vite.config.js` does not contain a `define` entry for `process.env.NODE_ENV`
- Test edge case: SW activate event correctly unregisters itself (pass-through SW behavior)

### Property-Based Tests

- Generate random sets of Vite build output filenames and verify the fixed SW never references a filename not in that set
- Generate random sequences of online/offline transitions and verify `useOffline.js` state machine behaves correctly without SW registration side effects
- Generate random cache states and verify that with a single SW registration, cache state remains consistent across activate/fetch cycles

### Integration Tests

- Full Docker build + serve test: build the image, start the container, load the app in a headless browser, assert no console errors and React renders
- SW lifecycle test: load the app, wait for SW to activate, reload the page, assert assets load from network (not a broken cache) and no ERR_ABORTED errors
- Dev mode test: run `npm run dev`, trigger a render error for an undefined component, assert the error message is non-minified and includes the component name
