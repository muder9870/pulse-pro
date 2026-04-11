# Bugfix Requirements Document

## Introduction

AI Pulse Pro has a broken theme system caused by three competing, conflicting theme implementations running simultaneously. When a user selects the Azure Light or Azure Dark theme via the `ThemeSelector` component in Settings, the CSS classes are correctly applied to `<html>` by `ThemeProvider`, but the rest of the app ignores them entirely. `App.jsx` listens to a separate `pulse-theme-change` event system (from the dead `ThemeManager` component) and stores only `light` or `dark` in Zustand's `activeTheme`. Every view, card, and component reads `activeTheme` from Zustand for conditional class logic — so Azure themes are never reflected in component styling, leaving the UI in a broken, inconsistent state. Additionally, `ThemeManager.jsx` is a dead duplicate that conflicts with the active `ThemeSelector`/`ThemeProvider` system.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user selects "Azure Light" or "Azure Dark" in the Theme Settings panel THEN the system applies `theme-electric-azure-light` or `theme-electric-azure-dark` CSS classes to `<html>` via `ThemeProvider` but all component-level conditional styling remains unchanged

1.2 WHEN `ThemeProvider` sets an Azure theme THEN the system does NOT update Zustand's `activeTheme`, so it stays as `"light"` or `"dark"` and all components continue rendering with the wrong theme styles

1.3 WHEN `App.jsx` initialises THEN the system reads `pulse-theme` from `localStorage` (written by the old `ThemeManager` event system) and overwrites any Azure theme that `ThemeProvider` may have restored from its own `theme` key in `localStorage`

1.4 WHEN `App.jsx` receives a `pulse-theme-change` event THEN the system resolves the theme to only `"light"` or `"dark"`, completely discarding `"electric-azure-light"` and `"electric-azure-dark"` values

1.5 WHEN the `ThemeSelector` component renders its own active-state styling THEN the system uses the `activeTheme` prop (from Zustand, always `light`/`dark`) for conditional classes, so the selector UI itself displays incorrectly under Azure themes

1.6 WHEN `ThemeManager.jsx` is present in the codebase THEN the system has a dead component that dispatches `pulse-theme-change` events on a separate `localStorage` key (`pulse-theme`), creating a conflicting second theme pipeline that can overwrite `ThemeProvider` state

### Expected Behavior (Correct)

2.1 WHEN a user selects any theme (Light, Dark, Azure Light, Azure Dark, or System) via `ThemeSelector` THEN the system SHALL reflect that theme consistently across all components — CSS classes on `<html>`, Zustand `activeTheme`, and all conditional class logic in views and cards

2.2 WHEN `ThemeProvider` updates the active theme THEN the system SHALL synchronise Zustand's `activeTheme` to the resolved theme value so that all components reading `activeTheme` render with correct styles

2.3 WHEN the app initialises THEN the system SHALL restore the theme from a single, unified `localStorage` key and SHALL NOT have two competing keys (`pulse-theme` vs `theme`) that can contradict each other

2.4 WHEN `App.jsx` handles theme state THEN the system SHALL delegate all theme resolution to `ThemeProvider` and SHALL NOT maintain a parallel event-based theme pipeline that only understands `light`/`dark`

2.5 WHEN a user selects an Azure theme THEN the system SHALL map the Azure theme to the correct light/dark mode context (Azure Light → light mode base, Azure Dark → dark mode base) so that components using `activeTheme === 'dark'` conditional logic render correctly

2.6 WHEN `ThemeSelector` renders THEN the system SHALL use the theme value from `ThemeProvider` context (not the Zustand `activeTheme` prop) for its own active-state and styling logic

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user selects "Light" theme THEN the system SHALL CONTINUE TO apply the `light` class to `<html>`, set `activeTheme` to `"light"` in Zustand, and render all components with the existing indigo light-mode styles

3.2 WHEN a user selects "Dark" theme THEN the system SHALL CONTINUE TO apply the `dark` class to `<html>`, set `activeTheme` to `"dark"` in Zustand, and render all components with the existing indigo dark-mode styles

3.3 WHEN a user selects "System" theme THEN the system SHALL CONTINUE TO resolve to `light` or `dark` based on the OS preference and apply the corresponding styles

3.4 WHEN a user refreshes the page THEN the system SHALL CONTINUE TO restore the previously selected theme from `localStorage` without flickering or reverting to a default

3.5 WHEN the OS colour scheme changes while "System" theme is active THEN the system SHALL CONTINUE TO automatically update the applied theme to match the new OS preference

3.6 WHEN any view, card, or component reads `activeTheme` from Zustand THEN the system SHALL CONTINUE TO receive a resolved `"light"` or `"dark"` value (Azure themes map to their respective base mode) so that existing conditional class logic (`activeTheme === 'dark' ? ... : ...`) keeps working without modification

3.7 WHEN the CSS overrides in `global.css` for `.theme-electric-azure-light` and `.theme-electric-azure-dark` are present THEN the system SHALL CONTINUE TO apply those overrides correctly once the class is on `<html>` and the Zustand store is in sync

---

## Bug Condition

**Bug Condition Function:**
```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ThemeSelection
  OUTPUT: boolean

  // Returns true when the selected theme is an Azure variant
  RETURN X.selectedTheme IN ['electric-azure-light', 'electric-azure-dark']
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← applyTheme'(X)
  ASSERT htmlClassList CONTAINS expectedAzureClass(X)
    AND zustandActiveTheme = resolvedBaseMode(X)   // 'light' or 'dark'
    AND allComponentsRenderWithCorrectStyles(result)
END FOR
```

**Property: Preservation Checking**
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT applyTheme(X) = applyTheme'(X)
  // Light, Dark, and System themes behave identically before and after the fix
END FOR
```
