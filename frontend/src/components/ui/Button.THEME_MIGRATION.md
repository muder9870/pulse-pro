# Button Component - Theme Token Migration

## Overview

The Button component has been updated to use theme tokens instead of hardcoded Tailwind color classes. This enables automatic light/dark mode support and centralized theme customization.

## Changes Made

### Before (Hardcoded Colors)
```jsx
const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
  success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
};
```

### After (Theme Tokens)
```jsx
const variants = {
  primary: 'bg-[var(--color-primary)] hover:brightness-90 text-white focus:ring-[var(--color-primary)]',
  secondary: 'bg-[var(--color-surface)] hover:brightness-95 dark:hover:brightness-110 text-[var(--color-text-primary)] focus:ring-[var(--color-secondary)]',
  success: 'bg-[var(--color-success)] hover:brightness-90 text-white focus:ring-[var(--color-success)]',
  danger: 'bg-[var(--color-danger)] hover:brightness-90 text-white focus:ring-[var(--color-danger)]',
  warning: 'bg-[var(--color-warning)] hover:brightness-90 text-white focus:ring-[var(--color-warning)]',
  info: 'bg-[var(--color-info)] hover:brightness-90 text-white focus:ring-[var(--color-info)]',
  ghost: 'hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:ring-[var(--color-secondary)]',
};
```

## New Features

### 1. Theme Token Integration
- All color values now reference CSS variables set by ThemeProvider
- Automatic adaptation to light/dark mode
- Centralized color management through `tokens.js`

### 2. Additional Variants
- **warning**: Added warning variant using theme warning color
- **info**: Added info variant using theme info color

### 3. Invalid Variant Handling
- Development mode warning when invalid variant is provided
- Automatic fallback to primary variant
- Prevents runtime errors from typos

### 4. Dark Mode Support
- Secondary variant uses `dark:hover:brightness-110` for better dark mode hover effect
- All variants automatically adapt to theme changes
- Smooth 200ms color transitions

## API Compatibility

The Button API remains **100% backward compatible**. All existing code will continue to work without changes:

```jsx
// All existing usage patterns still work
<Button variant="primary">Click me</Button>
<Button variant="secondary" size="lg">Large Button</Button>
<Button variant="danger" icon={Trash} loading>Delete</Button>
```

## Theme Token Reference

The Button component uses these CSS variables from the theme system:

| CSS Variable | Usage | Light Mode | Dark Mode |
|--------------|-------|------------|-----------|
| `--color-primary` | Primary variant | #4F46E5 (indigo-600) | #818CF8 (indigo-400) |
| `--color-secondary` | Secondary variant focus | #6B7280 (gray-500) | #9CA3AF (gray-400) |
| `--color-success` | Success variant | #059669 (emerald-600) | #34D399 (emerald-400) |
| `--color-danger` | Danger variant | #DC2626 (red-600) | #F87171 (red-400) |
| `--color-warning` | Warning variant | #D97706 (amber-600) | #FCD34D (amber-300) |
| `--color-info` | Info variant | #2563EB (blue-600) | #60A5FA (blue-400) |
| `--color-surface` | Secondary/ghost background | #F9FAFB (gray-50) | #1E293B (slate-800) |
| `--color-text-primary` | Secondary/ghost text | #111827 (gray-900) | #F9FAFB (gray-50) |

## Testing

### Unit Tests
- ✅ Renders with theme tokens in light mode
- ✅ Renders with theme tokens in dark mode
- ✅ All variants render correctly
- ✅ Invalid variant fallback works
- ✅ All sizes work correctly
- ✅ Loading state works
- ✅ Icon rendering works
- ✅ Full width mode works

### Visual Testing
Use `ButtonThemeExample.jsx` to visually test all variants in both light and dark modes:

```jsx
import ButtonThemeExample from './components/ui/ButtonThemeExample';

// In your app
<ThemeProvider>
  <ButtonThemeExample />
</ThemeProvider>
```

## Migration Guide for Other Components

To migrate other components to use theme tokens:

1. **Identify hardcoded colors**: Look for Tailwind color classes like `bg-indigo-600`, `text-gray-700`
2. **Map to theme tokens**: Replace with CSS variables like `bg-[var(--color-primary)]`
3. **Add dark mode support**: Use `dark:` prefix where needed for dark-specific styles
4. **Use brightness filters**: Replace color-specific hover states with `hover:brightness-90`
5. **Test both modes**: Verify component looks good in light and dark mode
6. **Add validation**: Warn on invalid props in development mode

## Requirements Validated

This implementation validates the following requirements:

- **Requirement 3.5**: Components use theme tokens instead of hardcoded values ✅
- **Requirement 4.1**: Components render with dark-appropriate colors in dark mode ✅
- **Requirement 10.1**: Consistent variant names across components ✅

## Next Steps

1. Update remaining components (Card, Badge, Input, Checkbox, Select, Modal) to use theme tokens
2. Add property-based tests for theme token usage
3. Verify WCAG 2.1 AA contrast ratios in both modes
4. Complete component documentation
