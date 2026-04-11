# Theme System Unification Bugfix Design

## Overview

AI Pulse Pro has three competing theme implementations running simultaneously. `ThemeProvider.jsx`
correctly applies CSS classes to `<html>` for all five themes but never syncs Zustand. `App.jsx`
runs a parallel event-based pipeline (`pulse-theme-change` events + `pulse-theme` localStorage key)
that only understands `light`/`dark`. `ThemeManager.jsx` is a dead duplicate that writes to the
same `pulse-theme` key. The result: every component reads `activeTheme` from Zustand for
conditional styling, but Zustand never receives Azure values — so Azure themes are silently ignored
at the component level.

The fix makes `ThemeProvider` the single source of truth. It will sync Zustand after every theme
change using a resolved base-mode mapping. `App.jsx` removes its parallel pipeline entirely.
`ThemeManager.jsx` is deleted. `ThemeSelector.jsx` is corrected to use the `ThemeProvider` context
value for its own active-state logic. All existing `activeTheme === 'dark' ? ... : ...` conditional
logic in views and components continues to work without modification.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when the selected theme is
  `electric-azure-light` or `electric-azure-dark`
- **Property (P)**: The desired behavior when the bug condition holds — CSS classes on `<html>`,
  Zustand `activeTheme`, and all component conditional styling must all reflect the selected theme
- **Preservation**: Existing light/dark/system theme behavior that must remain unchanged by the fix
- **ThemeProvider**: The component in `frontend/src/theme/ThemeProvider.jsx` that manages theme
  state, applies CSS classes to `<html>`, and (after the fix) syncs Zustand
- **activeTheme**: The Zustand store value in `appStore.js` read by every view and component for
  conditional class logic; must always be a resolved `'light'` or `'dark'` string
- **resolvedBaseMode**: The mapping from any theme value to its light/dark base:
  `light → 'light'`, `dark → 'dark'`, `electric-azure-light → 'light'`,
  `electric-azure-dark → 'dark'`, `system → OS preference`
- **pulse-theme**: The old `localStorage` key written by `ThemeManager.jsx` and read by `App.jsx`;
  conflicts with `ThemeProvider`'s `theme` key
- **parallel pipeline**: The `App.jsx` `useEffect` that listens to `pulse-theme-change` events and
  `storage` events, resolving themes independently of `ThemeProvider`

## Bug Details

### Bug Condition

The bug manifests when a user selects `electric-azure-light` or `electric-azure-dark` via
`ThemeSelector`. `ThemeProvider` correctly applies the CSS class to `<html>`, but it never calls
`setActiveTheme` in Zustand. Meanwhile `App.jsx`'s parallel pipeline reads from `pulse-theme`
localStorage (written by the dead `ThemeManager`) and resolves only to `'light'` or `'dark'`,
overwriting any Azure value. Every component reads `activeTheme` from Zustand for conditional
styling, so Azure themes are never reflected in component-level styles.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type ThemeSelection
  OUTPUT: boolean

  RETURN input.selectedTheme IN ['electric-azure-light', 'electric-azure-dark']
         AND zustandStore.activeTheme NOT IN ['electric-azure-light', 'electric-azure-dark']
         AND ThemeProvider.theme = input.selectedTheme
END FUNCTION
```

### Examples

- User selects "Azure Light": `<html>` gets `theme-electric-azure-light` class (correct), but
  Zustand `activeTheme` stays `'light'` — components render with indigo light styles, not azure
- User selects "Azure Dark": `<html>` gets `theme-electric-azure-dark dark` classes (correct), but
  Zustand `activeTheme` stays `'dark'` — components render with indigo dark styles, not azure
- `ThemeSelector` active-state: uses `activeTheme` prop (always `'light'`/`'dark'`) for its own
  border/background classes, so the selector UI itself shows wrong styling under Azure themes
- App init with Azure theme in `localStorage`: `App.jsx` reads `pulse-theme` key (which
  `ThemeManager` wrote as `'light'`/`'dark'`), overwriting the Azure theme `ThemeProvider` restored

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Selecting "Light" theme continues to apply the `light` class to `<html>`, set `activeTheme` to
  `'light'` in Zustand, and render all components with existing indigo light-mode styles
- Selecting "Dark" theme continues to apply the `dark` class to `<html>`, set `activeTheme` to
  `'dark'` in Zustand, and render all components with existing indigo dark-mode styles
- Selecting "System" theme continues to resolve to `'light'` or `'dark'` based on OS preference
- Page refresh continues to restore the previously selected theme from `localStorage` without
  flickering
- OS color scheme changes while "System" is active continue to automatically update the theme
- All existing `activeTheme === 'dark' ? ... : ...` conditional logic in views and components
  continues to work without modification (Azure themes map to their base mode)

**Scope:**
All inputs that do NOT involve Azure theme selection should be completely unaffected by this fix.
This includes:
- Light theme selection and rendering
- Dark theme selection and rendering
- System theme resolution and OS-change reactivity
- Page reload theme restoration
- All component conditional styling for light/dark modes

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **ThemeProvider never syncs Zustand**: `ThemeProvider.jsx` manages its own `theme` state and
   applies CSS classes, but has no reference to the Zustand store. It never calls `setActiveTheme`,
   so Zustand always holds whatever `App.jsx` last wrote — which is only ever `'light'` or `'dark'`

2. **App.jsx parallel pipeline shadows ThemeProvider**: The `useEffect` in `App.jsx` reads from
   `pulse-theme` localStorage and listens to `pulse-theme-change` events. It calls `setActiveTheme`
   with only `'light'`/`'dark'` values, effectively overriding any Azure sync that ThemeProvider
   might add. It also reads a different localStorage key (`pulse-theme`) than ThemeProvider uses
   (`theme`), creating two competing sources of truth on page load

3. **ThemeManager.jsx dead duplicate**: `ThemeManager.jsx` dispatches `pulse-theme-change` events
   and writes to `pulse-theme` localStorage. If it is ever rendered, it actively fights
   `ThemeProvider`. Even if not rendered, its existence creates confusion and risk

4. **ThemeSelector uses wrong value for active-state**: `ThemeSelector` receives `activeTheme` as a
   prop (from Zustand, always `'light'`/`'dark'`) and uses it for its own border/background
   conditional classes. It should use `theme` from `useTheme()` context, which it already reads for
   the `isActive` check — the prop is redundant and incorrect for styling

5. **appStore initializes from wrong localStorage key**: `appStore.js` initializes `activeTheme` by
   reading `pulse-theme` from localStorage (the old key), not `theme` (the ThemeProvider key). This
   means on first load, the store may be out of sync with what ThemeProvider restores

## Correctness Properties

Property 1: Bug Condition - Azure Theme Full-Stack Sync

_For any_ theme selection where the bug condition holds (selected theme is `electric-azure-light`
or `electric-azure-dark`), the fixed `ThemeProvider` SHALL apply the correct CSS class to `<html>`
AND call `setActiveTheme` with the resolved base mode (`'light'` for azure-light, `'dark'` for
azure-dark), so that all components reading `activeTheme` from Zustand render with the correct
conditional styles.

**Validates: Requirements 2.1, 2.2, 2.5**

Property 2: Preservation - Non-Azure Theme Behavior Unchanged

_For any_ theme selection where the bug condition does NOT hold (selected theme is `light`, `dark`,
or `system`), the fixed code SHALL produce exactly the same CSS class application, Zustand
`activeTheme` value, and component rendering as the original code, preserving all existing
light/dark/system theme behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/src/theme/ThemeProvider.jsx`

**Function**: `ThemeProvider` component / theme `useEffect`

**Specific Changes**:
1. **Import Zustand setter**: Import `useAppStore` from `../store/appStore` and extract
   `setActiveTheme` inside the component
2. **Sync Zustand on theme change**: In the existing `useEffect` that applies CSS classes, after
   resolving `themeMode`, call `setActiveTheme(themeMode)` — this is the single sync point

---

**File**: `frontend/src/App.jsx`

**Function**: `AppContent` component

**Specific Changes**:
1. **Remove parallel theme pipeline**: Delete the entire `useEffect` block that reads
   `pulse-theme` localStorage, calls `applyTheme`, and attaches `pulse-theme-change` and `storage`
   event listeners
2. **Remove `setActiveTheme` import from store**: The store setter is no longer needed in App.jsx
   since ThemeProvider now owns the sync

---

**File**: `frontend/src/store/appStore.js`

**Specific Changes**:
1. **Fix initial value**: Change the `activeTheme` initializer to read from the `theme` key
   (ThemeProvider's key) instead of `pulse-theme`, and apply the same `resolvedBaseMode` mapping
   so the initial Zustand value is consistent with what ThemeProvider will restore

---

**File**: `frontend/src/components/ThemeSelector.jsx`

**Function**: `ThemeSelector` component

**Specific Changes**:
1. **Replace `activeTheme` prop usage with `theme` from context**: The component already calls
   `useTheme()` and has `theme` available. Replace all `activeTheme === 'dark'` conditional
   expressions with `theme === 'dark' || theme === 'electric-azure-dark'` (or derive a local
   `isDark` boolean from `theme`) so the selector's own styling is correct under Azure themes

---

**File**: `frontend/src/components/ThemeManager.jsx`

**Specific Changes**:
1. **Delete the file**: This component is a dead duplicate. Remove it entirely. Verify no active
   import references it before deletion.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate
the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or
refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate theme selection for Azure themes and assert that Zustand
`activeTheme` is updated to the correct resolved base mode. Run these tests on the UNFIXED code to
observe failures and understand the root cause.

**Test Cases**:
1. **Azure Light Zustand Sync Test**: Select `electric-azure-light` via `ThemeProvider.setTheme`,
   then read Zustand `activeTheme` — expect `'light'`, will get `'light'` or `'dark'` from old
   pipeline (will fail on unfixed code because ThemeProvider never calls setActiveTheme)
2. **Azure Dark Zustand Sync Test**: Select `electric-azure-dark` via `ThemeProvider.setTheme`,
   then read Zustand `activeTheme` — expect `'dark'`, will get stale value (will fail on unfixed
   code)
3. **CSS Class + Zustand Consistency Test**: After selecting Azure Light, assert both
   `document.documentElement.classList.contains('theme-electric-azure-light')` AND
   `activeTheme === 'light'` — the CSS check passes but Zustand check fails (will fail on unfixed
   code)
4. **ThemeSelector Active State Test**: Render `ThemeSelector` with Azure Dark active, assert the
   Azure Dark button has the active styling — will fail because `activeTheme` prop is `'dark'` not
   `'electric-azure-dark'` (will fail on unfixed code)

**Expected Counterexamples**:
- Zustand `activeTheme` does not update when Azure themes are selected via ThemeProvider
- Possible causes: ThemeProvider has no Zustand reference, App.jsx parallel pipeline overwrites
  with light/dark only, appStore initializes from wrong localStorage key

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the
expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := ThemeProvider_fixed.setTheme(input.selectedTheme)
  ASSERT document.documentElement.classList CONTAINS expectedAzureClass(input)
    AND zustandStore.activeTheme = resolvedBaseMode(input)
    AND ThemeSelector renders with correct active-state styling
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function
produces the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT ThemeProvider_original.setTheme(input) produces same
         CSS classes AND Zustand activeTheme AS ThemeProvider_fixed.setTheme(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code for light/dark/system themes, then write
property-based tests capturing that behavior and verify it holds after the fix.

**Test Cases**:
1. **Light Theme Preservation**: Verify selecting `light` sets `activeTheme = 'light'` and applies
   no azure CSS classes — observe on unfixed code, then assert same behavior after fix
2. **Dark Theme Preservation**: Verify selecting `dark` sets `activeTheme = 'dark'` and applies
   `dark` class but no azure CSS classes — observe on unfixed code, then assert same after fix
3. **System Theme Preservation**: Verify selecting `system` resolves to OS preference and sets
   correct `activeTheme` — observe on unfixed code, then assert same after fix
4. **localStorage Persistence Preservation**: Verify theme is saved to `theme` key and restored on
   reload — observe on unfixed code, then assert same after fix

### Unit Tests

- Test that `ThemeProvider` calls `setActiveTheme('light')` when `electric-azure-light` is set
- Test that `ThemeProvider` calls `setActiveTheme('dark')` when `electric-azure-dark` is set
- Test that `ThemeProvider` calls `setActiveTheme('light')` when `light` is set (preservation)
- Test that `ThemeProvider` calls `setActiveTheme('dark')` when `dark` is set (preservation)
- Test that `ThemeSelector` renders the correct active-state styling for each of the five themes
- Test that `App.jsx` no longer contains `pulse-theme-change` event listener logic

### Property-Based Tests

- Generate random selections from `['light', 'dark', 'system']` and verify `activeTheme` is always
  a resolved `'light'` or `'dark'` value (never an azure string) — preservation property
- Generate random selections from all five themes and verify `resolvedBaseMode` is always
  `'light'` or `'dark'` — fix property
- Generate random sequences of theme changes and verify Zustand `activeTheme` always equals
  `resolvedBaseMode(currentTheme)` after each change — consistency property

### Integration Tests

- Test full theme selection flow: click Azure Light in `ThemeSelector` → verify CSS class on
  `<html>`, Zustand value, and a sample component's conditional class all update correctly
- Test page reload with Azure theme in localStorage: verify theme is restored correctly without
  the old `pulse-theme` key interfering
- Test switching between Azure and non-Azure themes in sequence: verify no stale state remains
- Test that `ThemeManager.jsx` is no longer importable/rendered anywhere in the app
