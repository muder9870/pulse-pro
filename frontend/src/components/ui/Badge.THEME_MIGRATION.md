# Badge Component - Theme Migration Guide

## Overview

The Badge component has been updated to use theme tokens from the centralized theme system, enabling automatic light/dark mode support and consistent styling across the application.

## What Changed

### Before (Hardcoded Colors)
```jsx
const variants = {
  default: 'bg-gray-100 text-gray-700 border border-gray-200',
  primary: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  success: 'bg-green-100 text-green-700 border border-green-200',
  // ... etc
};
```

### After (Theme Tokens)
```jsx
const variants = {
  secondary: 'bg-[var(--color-surface)] text-[var(--color-secondary)] border border-[var(--color-border)]',
  primary: 'bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)] border border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]',
  success: 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]',
  // ... etc
};
```

## Key Changes

### 1. Variant Name Change
- **Old:** `default` variant
- **New:** `secondary` variant (aligns with design system naming)

**Migration:**
```jsx
// Before
<Badge variant="default">Status</Badge>

// After
<Badge variant="secondary">Status</Badge>
```

### 2. Theme Token Integration
All color values now use CSS variables that automatically adapt to light/dark mode:

- `var(--color-primary)` - Primary brand color
- `var(--color-secondary)` - Secondary/neutral color
- `var(--color-success)` - Success state color
- `var(--color-danger)` - Danger/error state color
- `var(--color-warning)` - Warning state color
- `var(--color-info)` - Info state color
- `var(--color-surface)` - Surface/background color
- `var(--color-border)` - Border color

### 3. Color Mixing for Backgrounds
The component now uses CSS `color-mix()` to create lighter background colors:
- 15% opacity for backgrounds
- 30% opacity for borders

This ensures proper contrast in both light and dark modes.

### 4. Dot Indicator Colors
Dot indicators now use theme tokens:
```jsx
const dotColors = {
  secondary: 'bg-[var(--color-secondary)]',
  primary: 'bg-[var(--color-primary)]',
  // ... etc
};
```

### 5. Validation and Error Handling
Added development-mode validation:
```jsx
if (process.env.NODE_ENV === 'development' && !variants[variant]) {
  console.warn(
    `Invalid variant "${variant}" provided to Badge. ` +
    `Valid variants are: ${Object.keys(variants).join(', ')}. ` +
    `Falling back to "secondary" variant.`
  );
}
```

## Usage Examples

### Basic Usage
```jsx
import Badge from './components/ui/Badge';

// All variants automatically support light/dark mode
<Badge variant="primary">New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="danger">Error</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="secondary">Default</Badge>
```

### With Dot Indicator
```jsx
<Badge variant="success" dot>Online</Badge>
<Badge variant="danger" dot>Offline</Badge>
```

### Different Sizes
```jsx
<Badge variant="primary" size="xs">XS</Badge>
<Badge variant="primary" size="sm">Small</Badge>
<Badge variant="primary" size="md">Medium</Badge>
<Badge variant="primary" size="lg">Large</Badge>
```

### With Theme Provider
```jsx
import { ThemeProvider } from './theme/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <Badge variant="primary">Themed Badge</Badge>
    </ThemeProvider>
  );
}
```

## Testing

### Visual Testing
Use the `BadgeThemeExample.jsx` component to visually test all variants in both light and dark modes:

```jsx
import BadgeThemeExample from './components/ui/BadgeThemeExample';

// Render in your app to see all variants
<BadgeThemeExample />
```

### Unit Testing
The component includes comprehensive tests in `Badge.test.jsx`:
- Rendering tests
- Variant tests
- Size tests
- Dot indicator tests
- Theme integration tests
- Accessibility tests

## Requirements Validated

This migration validates the following requirements:

- **Requirement 3.5:** Components use Theme_System tokens instead of hardcoded values
- **Requirement 4.1:** Components render with dark-appropriate colors when Dark_Mode is enabled
- **Requirement 10.1:** Consistent variant names across all components

## Browser Compatibility

The `color-mix()` CSS function is supported in:
- Chrome 111+
- Firefox 113+
- Safari 16.2+
- Edge 111+

For older browsers, the component will fall back to the base theme colors.

## Breaking Changes

### Variant Name Change
The `default` variant has been renamed to `secondary` to align with the design system.

**Action Required:**
Search your codebase for `variant="default"` and replace with `variant="secondary"`:

```bash
# Search for usage
grep -r 'variant="default"' frontend/src/

# Replace (example)
sed -i 's/variant="default"/variant="secondary"/g' frontend/src/**/*.jsx
```

### Theme Provider Required
The Badge component now requires the ThemeProvider to be present in the component tree. Ensure your app is wrapped with ThemeProvider:

```jsx
import { ThemeProvider } from './theme/ThemeProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
```

## Next Steps

1. Update all Badge usages to use `secondary` instead of `default`
2. Wrap your app with ThemeProvider if not already done
3. Test Badge component in both light and dark modes
4. Verify color contrast meets WCAG 2.1 AA standards
5. Update any custom Badge styles to use theme tokens

## Related Components

Other components that have been migrated to use theme tokens:
- Button
- Card
- (More components to be migrated)

## Support

For questions or issues with the Badge component migration, refer to:
- Theme system documentation: `frontend/src/theme/README.md`
- Design document: `.kiro/specs/component-library-completion/design.md`
- Requirements: `.kiro/specs/component-library-completion/requirements.md`
