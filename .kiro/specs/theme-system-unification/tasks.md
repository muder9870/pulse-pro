# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Azure Theme Zustand Sync Bug
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate ThemeProvider never calls setActiveTheme for Azure themes
  - **Scoped PBT Approach**: Scope the property to the two concrete failing cases: `electric-azure-light` and `electric-azure-dark`
  - In `frontend/src/theme/ThemeProvider.test.jsx`, add a new `describe('Bug Condition — Azure Zustand Sync')` block
  - Mock `useAppStore` from `../store/appStore` to capture calls to `setActiveTheme`
  - Render `ThemeProvider` and call `setTheme('electric-azure-light')` — assert `setActiveTheme` was called with `'light'`
  - Render `ThemeProvider` and call `setTheme('electric-azure-dark')` — assert `setActiveTheme` was called with `'dark'`
  - Also assert `document.documentElement.classList.contains('theme-electric-azure-light')` is true after azure-light selection (CSS side should pass; Zustand side will fail)
  - Run test on UNFIXED code: `cd frontend && npx vitest run src/theme/ThemeProvider.test.jsx`
  - **EXPECTED OUTCOME**: Tests FAIL — `setActiveTheme` is never called by ThemeProvider (confirms bug exists)
  - Document counterexamples found (e.g., "setActiveTheme never called when electric-azure-light selected")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Azure Theme Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behavior first
  - In `frontend/src/theme/ThemeProvider.test.jsx`, add a new `describe('Preservation — Non-Azure Themes')` block
  - Observe on UNFIXED code: `setTheme('light')` → `activeTheme` stays `'light'`, `dark` class absent, no azure classes
  - Observe on UNFIXED code: `setTheme('dark')` → `activeTheme` stays `'dark'`, `dark` class present, no azure classes
  - Observe on UNFIXED code: `setTheme('system')` → resolves to OS preference (`'light'` or `'dark'`), no azure classes
  - Write property-based style tests: for all themes in `['light', 'dark', 'system']`, assert `setActiveTheme` is called with a resolved `'light'` or `'dark'` value (never an azure string)
  - Write test: after `setTheme('light')`, assert `document.documentElement.classList` does NOT contain `theme-electric-azure-light` or `theme-electric-azure-dark`
  - Write test: after `setTheme('dark')`, assert `document.documentElement.classList.contains('dark')` is true and no azure classes present
  - Write test: localStorage key `theme` is written (not `pulse-theme`) after any theme change
  - Run tests on UNFIXED code: `cd frontend && npx vitest run src/theme/ThemeProvider.test.jsx`
  - **EXPECTED OUTCOME**: Tests PASS — confirms baseline behavior to preserve
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix theme system unification

  - [x] 3.1 Fix ThemeProvider.jsx — add Zustand sync
    - Import `useAppStore` from `'../store/appStore'` at the top of `ThemeProvider.jsx`
    - Inside the `ThemeProvider` component body, extract `setActiveTheme`: `const setActiveTheme = useAppStore((s) => s.setActiveTheme);`
    - In the existing CSS-variables `useEffect` (the one that branches on `electric-azure-light`, `electric-azure-dark`, `system`, etc.), add `setActiveTheme(themeMode)` as the final statement before the closing brace — `themeMode` is already resolved to `'light'` or `'dark'` in every branch
    - Add `setActiveTheme` to the `useEffect` dependency array
    - This is the single sync point — no other file should call `setActiveTheme` for theme changes
    - _Bug_Condition: isBugCondition(X) where X.selectedTheme IN ['electric-azure-light', 'electric-azure-dark'] AND zustandStore.activeTheme NOT IN those values_
    - _Expected_Behavior: setActiveTheme(themeMode) called with 'light' for azure-light, 'dark' for azure-dark_
    - _Preservation: themeMode is already 'light'/'dark' for light/dark/system branches — existing behavior unchanged_
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 3.2 Fix appStore.js — read from correct localStorage key
    - In `appStore.js`, change the `activeTheme` IIFE initializer to read from `localStorage.getItem('theme')` instead of `localStorage.getItem('pulse-theme')`
    - Apply the same `resolvedBaseMode` mapping: if saved value is `'electric-azure-light'` return `'light'`; if `'electric-azure-dark'` return `'dark'`; if `'system'` resolve via `window.matchMedia`; otherwise return the saved value or `'light'` as fallback
    - This ensures the initial Zustand value on page load is consistent with what ThemeProvider will restore from the `theme` key
    - _Requirements: 2.3, 1.3_

  - [x] 3.3 Remove App.jsx parallel theme pipeline
    - In `frontend/src/App.jsx`, delete the entire `useEffect` block that: reads `localStorage.getItem('pulse-theme')`, defines `applyTheme`, calls `setActiveTheme`, and attaches `pulse-theme-change` and `storage` event listeners (approximately lines 97–115)
    - Remove `setActiveTheme` from the Zustand destructuring in `AppContent` (the line `const setActiveTheme = useAppStore((s) => s.setActiveTheme);`) — ThemeProvider now owns the sync
    - Keep `activeTheme` read from the store — all components still use it for conditional styling
    - _Requirements: 2.4, 1.3, 1.4_

  - [x] 3.4 Fix ThemeSelector.jsx active-state styling
    - In `frontend/src/components/ThemeSelector.jsx`, derive a local `isDark` boolean from the `theme` context value already available via `useTheme()`: `const isDark = theme === 'dark' || theme === 'electric-azure-dark';`
    - Replace all `activeTheme === 'dark'` conditional expressions in the JSX with `isDark`
    - The `activeTheme` prop is now unused in this component — remove it from the destructured props or leave it for backward compatibility (callers pass it; it just won't be used for styling)
    - _Requirements: 2.6, 1.5_

  - [x] 3.5 Delete ThemeManager.jsx
    - Verify no active imports reference `ThemeManager` by searching the codebase: `grep -r "ThemeManager" frontend/src --include="*.jsx" --include="*.js" --include="*.tsx"`
    - If no active imports are found, delete `frontend/src/components/ThemeManager.jsx`
    - _Requirements: 1.6, 2.4_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Azure Theme Zustand Sync Bug
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `setActiveTheme` called with `'light'` for azure-light, `'dark'` for azure-dark
    - Run: `cd frontend && npx vitest run src/theme/ThemeProvider.test.jsx`
    - **EXPECTED OUTCOME**: Bug condition tests PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Azure Theme Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `cd frontend && npx vitest run src/theme/ThemeProvider.test.jsx`
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions for light/dark/system)
    - Confirm all pre-existing tests in the file also still pass
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full frontend test suite: `cd frontend && npx vitest run`
  - All tests must pass — zero failures
  - If any test fails, investigate and fix before marking complete
  - Ensure all tests pass; ask the user if questions arise
