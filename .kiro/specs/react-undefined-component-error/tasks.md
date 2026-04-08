# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stale SW Cache Manifest and Dual Registration
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the two concrete failing cases:
    1. SW install with unhashed paths (`/assets/index.js`, `/assets/index.css`) that return 404
    2. Dual SW registration where both SWs share cache name `pulse-pro-v1`
  - Test 1 — Stale manifest: mock `cache.addAll()` with a fetch handler returning 404 for `/assets/index.js` and `/assets/index.css`; assert the SW install event rejects (isBugCondition: `hasStaleManifest = true`)
  - Test 2 — Dual registration: simulate registering both `/service-worker.js` and `/sw.js`; assert `swRegistrationCount > 1` (isBugCondition: `hasDualRegistration = true`)
  - Test 3 — Asset load: simulate a page load with the broken SW active; assert requests for `/assets/index-[hash].js` return a valid response (will fail — SW has no matching cache entry)
  - Run tests on UNFIXED `dist/service-worker.js` and UNFIXED `useOffline.js`
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., "`cache.addAll()` rejects with `TypeError: Failed to fetch` for `/assets/index.js`")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-SW Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs first
  - Observe: `/api/` requests are proxied to `http://localhost:5000` in dev and `http://backend:5000` in Docker (isBugCondition returns false — no SW interference)
  - Observe: `npm run build` produces `dist/assets/index-[hash].js` and `dist/assets/index-[hash].css` on unfixed code
  - Observe: `main.jsx` `getRegistrations().forEach(r => r.unregister())` runs and clears all SW registrations on startup
  - Observe: all dashboard views (Analytics, Calendar, Media, Research, Podcast, Settings) render correctly when no stale SW is active
  - Write property-based test: for all non-SW-related app states (no stale manifest, single registration), the app renders without error and all API calls succeed
  - Write property-based test: for any sequence of online/offline transitions, `useOffline.js` state machine behaves correctly without triggering SW registration side effects
  - Write property-based test: for any Vite build output filenames, the fixed SW never references a filename not in that set
  - Verify all tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix React undefined component error (five-file patch)

  - [x] 3.1 Replace `frontend/dist/service-worker.js` with pass-through SW
    - Replace entire file content with the "Disabled — immediately unregister" implementation identical to `frontend/public/service-worker.js`
    - Remove `ASSETS_TO_CACHE`, `CACHE_NAME`, and the `cache.addAll()` call from the install handler
    - The install handler must only call `caches.keys()` to delete all caches then `self.skipWaiting()`
    - The activate handler must delete all caches, call `self.clients.claim()`, then `self.registration.unregister()`
    - The fetch handler must pass all requests through with `e.respondWith(fetch(e.request))`
    - _Bug_Condition: isBugCondition(appState) where hasStaleManifest = ANY path IN cacheManifest NOT IN actualAssetPaths_
    - _Expected_Behavior: result.assetLoadErrors.length === 0 AND result.reactError === null_
    - _Preservation: dist/service-worker.js change does not affect API proxying, nginx routing, or build output_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Align `frontend/dist/sw.js` with `frontend/public/sw.js`
    - Replace entire file content with the same "Disabled — immediately unregister" implementation
    - Ensure `dist/sw.js` is byte-for-byte equivalent to `public/sw.js` so no stale SW variant remains in the served directory
    - _Bug_Condition: isBugCondition(appState) where hasDualRegistration = swRegistrationCount > 1_
    - _Expected_Behavior: result.activeSwCount === 1_
    - _Requirements: 2.4_

  - [x] 3.3 Remove programmatic SW registration from `frontend/src/hooks/useOffline.js`
    - Delete the `navigator.serviceWorker.register('/sw.js')` call and its `.then`/`.catch` handlers from the `useEffect`
    - Keep the `navigator.serviceWorker.ready` promise — the hook may still detect SW readiness, it must not register a new SW
    - Verify the `useEffect` dependency array is still correct after removal
    - _Bug_Condition: isBugCondition(appState) where hasDualRegistration = swRegistrationCount > 1_
    - _Expected_Behavior: result.activeSwCount === 1 (only the SW registered by index.html / cleared by main.jsx)_
    - _Preservation: useOffline.js still exports isOnline, isOfflineMode, queue, syncQueue, offlineFetch and all other state — only the register() side-effect is removed_
    - _Requirements: 2.4, 3.1, 3.2_

  - [x] 3.4 Remove hardcoded `NODE_ENV` define from `frontend/vite.config.js`
    - Delete the `'process.env.NODE_ENV': '"production"'` line from the `define` block
    - Keep `'import.meta.env.VITE_ENABLE_SW': 'false'` if it is referenced elsewhere; remove it too if unused
    - Verify that `npm run dev` now shows non-minified React errors with component names
    - _Bug_Condition: isBugCondition(appState) — this change surfaces the bug more clearly in dev mode_
    - _Expected_Behavior: running npm run dev shows "Element type is invalid: expected a string... but got: undefined. Check the render method of App." instead of minified error #130_
    - _Preservation: Vite sets NODE_ENV correctly via --mode flag; removing the define does not affect production builds_
    - _Requirements: 2.5, 3.2_

  - [x] 3.5 Fix `rollupOptions` filename pattern in `frontend/vite.config.js`
    - Either add `[hash]` to `entryFileNames` (change `'assets/[name].js'` to `'assets/[name]-[hash].js'`) or remove the `rollupOptions.output` override entirely to use Vite defaults
    - Ensure `chunkFileNames` and `assetFileNames` also include `[hash]` if the override is kept
    - Run `npm run build` and verify `dist/assets/` contains `index-[hash].js` and `index-[hash].css` with consistent hashes matching `dist/index.html`
    - _Bug_Condition: isBugCondition(appState) where hasStaleManifest — the rollup config was stripping hashes, making dist/ inconsistent_
    - _Expected_Behavior: dist/index.html references the same hashed filenames that exist in dist/assets/_
    - _Preservation: build output structure (single JS + CSS in /dist/assets/) must remain unchanged; only the hash suffix is added_
    - _Requirements: 2.1, 3.5_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Asset Loading Succeeds After SW Fix
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior; when they pass the fix is confirmed
    - Run all three test cases from task 1 against the fixed files
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed — no stale manifest, single SW registration, assets load with HTTP 200)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-SW Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from task 2 against the fixed codebase
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in API proxying, build output, SW unregistration, and UI rendering)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite and confirm all tests pass
  - Verify in a browser (or headless browser) that the app loads without console errors after the fix
  - Confirm exactly one SW is registered (check DevTools > Application > Service Workers)
  - Confirm all assets load with HTTP 200 (check DevTools > Network)
  - Confirm `npm run dev` shows non-minified React errors when a component is undefined
  - Ask the user if any questions arise
