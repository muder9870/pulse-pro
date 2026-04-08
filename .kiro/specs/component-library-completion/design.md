# Design Document: Component Library Completion

## Overview

This design completes the AI Pulse Pro component library by adding 8 missing core components, implementing a comprehensive theme system with dark mode support, migrating all application code to use the design system, and ensuring accessibility compliance. The design maintains the existing API patterns established by the current 7 components (Button, Card, Badge, Input, Checkbox, Select, Modal) while introducing a centralized theme system and comprehensive testing strategy.

### Goals

- Add 8 missing core components (Tooltip, Dropdown, Tabs, Toast, Spinner, Alert, Avatar, Progress)
- Implement a theme system with design tokens for colors, spacing, typography, and borders
- Add dark mode support with WCAG 2.1 AA compliant contrast ratios
- Migrate all 30+ application components from ad-hoc styling to design system components
- Achieve 90% test coverage with both unit and property-based tests
- Ensure WCAG 2.1 AA accessibility compliance across all components
- Optimize bundle size to under 50KB gzipped
- Provide comprehensive documentation for all components

### Non-Goals

- Visual regression testing (will be addressed in a future spec)
- Storybook integration (will be addressed in a future spec)
- Component animation library (basic transitions only)
- Internationalization support (will be addressed in a future spec)

## Architecture

### Theme System Architecture

The theme system uses a centralized configuration object that defines all design tokens. Components consume these tokens through a React Context provider, enabling runtime theme switching without page reload.

```
┌─────────────────────────────────────────────────────────┐
│                    ThemeProvider                         │
│  - Manages current theme (light/dark)                   │
│  - Provides theme tokens via Context                    │
│  - Persists preference to localStorage                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ├─────────────────────────────┐
                            │                             │
                ┌───────────▼──────────┐      ┌──────────▼─────────┐
                │   Theme Config       │      │  useTheme Hook     │
                │  - Light tokens      │      │  - Access tokens   │
                │  - Dark tokens       │      │  - Toggle theme    │
                │  - Spacing scale     │      │  - Get current     │
                │  - Typography        │      └────────────────────┘
                │  - Border radius     │
                └──────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
    ┌───────────▼──────────┐  ┌────────▼──────────┐
    │  Component Library   │  │  Application      │
    │  - Button            │  │  Components       │
    │  - Card              │  │  - Dashboard      │
    │  - Tooltip           │  │  - Settings       │
    │  - etc.              │  │  - etc.           │
    └──────────────────────┘  └───────────────────┘
```

### Component Organization

```
frontend/src/
├── components/
│   ├── ui/                          # Component Library
│   │   ├── Button.jsx               # Existing
│   │   ├── Card.jsx                 # Existing
│   │   ├── Badge.jsx                # Existing
│   │   ├── Input.jsx                # Existing
│   │   ├── Checkbox.jsx             # Existing
│   │   ├── Select.jsx               # Existing
│   │   ├── Modal.jsx                # Existing
│   │   ├── Tooltip.jsx              # New
│   │   ├── Dropdown.jsx             # New
│   │   ├── Tabs.jsx                 # New
│   │   ├── Toast.jsx                # New
│   │   ├── Spinner.jsx              # New
│   │   ├── Alert.jsx                # New
│   │   ├── Avatar.jsx               # New
│   │   ├── Progress.jsx             # New
│   │   ├── Stack.jsx                # New (layout)
│   │   ├── Grid.jsx                 # New (layout)
│   │   ├── Flex.jsx                 # New (layout)
│   │   └── index.js                 # Barrel export
│   ├── AnalyticsDashboard.jsx       # Application components
│   ├── DailyIntelligence.jsx        # (to be migrated)
│   └── ...
├── theme/
│   ├── ThemeProvider.jsx            # Theme context provider
│   ├── useTheme.js                  # Theme hook
│   ├── tokens.js                    # Design tokens
│   └── index.js                     # Barrel export
└── hooks/
    └── useTheme.js                  # Re-export from theme/
```

### Migration Strategy

The migration follows a phased approach to minimize risk:

**Phase 1: Theme System Foundation**
1. Create theme configuration with all design tokens
2. Implement ThemeProvider and useTheme hook
3. Update existing 7 components to use theme tokens
4. Test theme switching functionality

**Phase 2: New Component Development**
1. Implement 8 new components using theme tokens
2. Write unit and property-based tests for each
3. Create documentation for each component
4. Verify accessibility compliance

**Phase 3: Application Migration**
1. Identify all ad-hoc styling patterns in application components
2. Migrate components in order of complexity (simple to complex)
3. Test each migrated component thoroughly
4. Verify no visual regressions

**Phase 4: Optimization and Documentation**
1. Implement lazy loading for heavy components
2. Optimize bundle size
3. Complete documentation
4. Run final accessibility audit

## Components and Interfaces

### Theme System Interface

```typescript
// Theme token structure
interface ThemeTokens {
  colors: {
    primary: { light: string; dark: string; }
    secondary: { light: string; dark: string; }
    success: { light: string; dark: string; }
    danger: { light: string; dark: string; }
    warning: { light: string; dark: string; }
    info: { light: string; dark: string; }
    background: { light: string; dark: string; }
    surface: { light: string; dark: string; }
    text: { primary: { light: string; dark: string; }; secondary: { light: string; dark: string; } }
    border: { light: string; dark: string; }
  }
  spacing: {
    xs: string; sm: string; md: string; lg: string; xl: string;
  }
  typography: {
    fontSize: { xs: string; sm: string; md: string; lg: string; xl: string; }
    fontWeight: { normal: number; medium: number; semibold: number; bold: number; }
    lineHeight: { tight: number; normal: number; relaxed: number; }
  }
  borderRadius: {
    sm: string; md: string; lg: string; xl: string; full: string;
  }
}

// Theme context interface
interface ThemeContext {
  theme: 'light' | 'dark';
  tokens: ThemeTokens;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// useTheme hook
const useTheme = (): ThemeContext
```

### New Component APIs

#### Tooltip Component

```typescript
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

// Usage:
<Tooltip content="Delete item" position="top">
  <Button variant="danger">Delete</Button>
</Tooltip>
```

**Implementation Notes:**
- Uses Radix UI Tooltip primitive for accessibility
- Positions using floating-ui for smart positioning
- Supports keyboard navigation (Escape to close)
- ARIA: role="tooltip", aria-describedby

#### Dropdown Component

```typescript
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

interface DropdownItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  icon?: React.ComponentType;
  className?: string;
}

// Usage:
<Dropdown trigger={<Button>Actions</Button>}>
  <Dropdown.Item icon={Edit} onSelect={handleEdit}>Edit</Dropdown.Item>
  <Dropdown.Item icon={Trash} onSelect={handleDelete}>Delete</Dropdown.Item>
</Dropdown>
```

**Implementation Notes:**
- Uses Radix UI Dropdown Menu primitive
- Keyboard navigation: Arrow keys, Enter, Escape
- ARIA: role="menu", role="menuitem", aria-expanded
- Supports nested menus

#### Tabs Component

```typescript
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

// Usage:
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">Overview content</Tabs.Content>
  <Tabs.Content value="analytics">Analytics content</Tabs.Content>
</Tabs>
```

**Implementation Notes:**
- Supports both controlled and uncontrolled modes
- Keyboard navigation: Arrow keys, Home, End
- ARIA: role="tablist", role="tab", role="tabpanel", aria-selected
- Smooth transitions between tabs

#### Toast Component

```typescript
interface ToastProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
}

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Usage:
const { toast } = useToast();

toast({
  variant: 'success',
  title: 'Success',
  description: 'Your changes have been saved.',
  duration: 3000
});
```

**Implementation Notes:**
- Uses Radix UI Toast primitive
- Auto-dismisses after duration (default 5000ms)
- Supports manual dismissal
- ARIA: role="status", aria-live="polite"
- Stacks multiple toasts

#### Spinner Component

```typescript
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  className?: string;
}

// Usage:
<Spinner size="md" variant="primary" />
```

**Implementation Notes:**
- CSS animation for smooth rotation
- ARIA: role="status", aria-label="Loading"
- Sizes: xs(12px), sm(16px), md(24px), lg(32px), xl(48px)

#### Alert Component

```typescript
interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ComponentType;
  className?: string;
}

// Usage:
<Alert variant="warning" title="Warning" dismissible>
  Your session will expire in 5 minutes.
</Alert>
```

**Implementation Notes:**
- Optional dismiss button
- Custom icons per variant
- ARIA: role="alert" for errors, role="status" for info
- Smooth fade-out animation on dismiss

#### Avatar Component

```typescript
interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  icon?: React.ComponentType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'square';
  className?: string;
}

// Usage:
<Avatar src="/user.jpg" alt="John Doe" size="md" />
<Avatar initials="JD" size="md" />
<Avatar icon={User} size="md" />
```

**Implementation Notes:**
- Fallback order: image → initials → icon
- Lazy loads images
- ARIA: img role with alt text
- Sizes: xs(24px), sm(32px), md(40px), lg(48px), xl(64px)

#### Progress Component

```typescript
interface ProgressProps {
  value?: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  indeterminate?: boolean;
  className?: string;
}

// Usage:
<Progress value={60} max={100} variant="primary" showLabel />
<Progress indeterminate variant="primary" />
```

**Implementation Notes:**
- Determinate mode: shows progress from 0 to max
- Indeterminate mode: animated loading bar
- ARIA: role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax
- Smooth transitions for value changes

### Layout Components

#### Stack Component

```typescript
interface StackProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}

// Usage:
<Stack direction="vertical" spacing="md" align="start">
  <Button>First</Button>
  <Button>Second</Button>
</Stack>
```

#### Grid Component

```typescript
interface GridProps {
  children: React.ReactNode;
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Usage:
<Grid columns={{ xs: 1, md: 2, lg: 3 }} gap="md">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

#### Flex Component

```typescript
interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Usage:
<Flex direction="row" justify="between" align="center">
  <div>Left content</div>
  <div>Right content</div>
</Flex>
```

## Data Models

### Theme Configuration Model

```javascript
// frontend/src/theme/tokens.js
export const themeTokens = {
  colors: {
    primary: {
      light: '#4F46E5', // indigo-600
      dark: '#6366F1'   // indigo-500
    },
    secondary: {
      light: '#6B7280', // gray-500
      dark: '#9CA3AF'   // gray-400
    },
    success: {
      light: '#10B981', // green-500
      dark: '#34D399'   // green-400
    },
    danger: {
      light: '#EF4444', // red-500
      dark: '#F87171'   // red-400
    },
    warning: {
      light: '#F59E0B', // amber-500
      dark: '#FBBF24'   // amber-400
    },
    info: {
      light: '#3B82F6', // blue-500
      dark: '#60A5FA'   // blue-400
    },
    background: {
      light: '#FFFFFF',
      dark: '#0F172A'   // slate-900
    },
    surface: {
      light: '#F9FAFB', // gray-50
      dark: '#1E293B'   // slate-800
    },
    text: {
      primary: {
        light: '#111827', // gray-900
        dark: '#F9FAFB'   // gray-50
      },
      secondary: {
        light: '#6B7280', // gray-500
        dark: '#94A3B8'   // slate-400
      }
    },
    border: {
      light: '#E5E7EB', // gray-200
      dark: '#334155'   // slate-700
    }
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem'      // 32px
  },
  typography: {
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      md: '1rem',      // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem'    // 20px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  borderRadius: {
    sm: '0.25rem',  // 4px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    full: '9999px'
  }
};
```

### Component Variant Mapping

```javascript
// Maps semantic variants to theme color tokens
export const variantColorMap = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  ghost: 'secondary' // Uses secondary with transparent background
};

// Standard size scale used across all components
export const sizeScale = ['xs', 'sm', 'md', 'lg', 'xl'];

// Standard variant names used across all components
export const variantNames = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'ghost'];
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Component positioning consistency

*For any* Tooltip component with a specified position (top, bottom, left, right), the rendered tooltip should appear in the correct position relative to its trigger element.

**Validates: Requirements 1.1**

### Property 2: Keyboard navigation completeness

*For any* interactive component (Dropdown, Tabs, Modal, Tooltip), all interactive elements should be reachable and operable using only keyboard navigation (Tab, Arrow keys, Enter, Escape).

**Validates: Requirements 1.2, 6.3, 7.1**

### Property 3: Controlled and uncontrolled mode equivalence

*For any* Tabs component, when given the same sequence of user interactions, the controlled mode (with value prop) and uncontrolled mode (with defaultValue prop) should produce equivalent visual states.

**Validates: Requirements 1.3**

### Property 4: Variant rendering consistency

*For any* component that supports variants (Button, Badge, Alert, Toast, Progress), each variant should render with the correct theme colors and styling as defined in the theme configuration.

**Validates: Requirements 1.4, 1.5, 10.1**

### Property 5: Dismissible component behavior

*For any* dismissible component (Alert, Toast), when the dismiss action is triggered, the onDismiss callback should be called and the component should be removed from the DOM.

**Validates: Requirements 1.6**

### Property 6: Avatar fallback cascade

*For any* Avatar component, if the image fails to load, it should display initials; if initials are not provided, it should display the icon; if no icon is provided, it should display a default icon.

**Validates: Requirements 1.7**

### Property 7: Progress mode rendering

*For any* Progress component, when in determinate mode (value prop provided), it should display the progress bar filled to the correct percentage; when in indeterminate mode (no value prop), it should display an animated loading state.

**Validates: Requirements 1.8**

### Property 8: Theme token usage

*For any* Component_Library component, all color, spacing, typography, and border radius values should come from the theme configuration rather than hardcoded values.

**Validates: Requirements 3.5**

### Property 9: Theme switching without reload

*For any* application state, when the theme is toggled from light to dark or dark to light, all components should re-render with the new theme colors without requiring a page reload.

**Validates: Requirements 3.6**

### Property 10: Dark mode color application

*For any* Component_Library component, when dark mode is enabled, the component should render using the dark color tokens from the theme configuration.

**Validates: Requirements 4.1**

### Property 11: Contrast ratio compliance

*For any* text element in any component in both light and dark modes, the contrast ratio between text and background should meet or exceed 4.5:1 for normal text and 3:1 for large text (WCAG 2.1 AA standard).

**Validates: Requirements 4.4**

### Property 12: Dark mode persistence

*For any* dark mode preference setting, after setting the preference and reloading the page, the application should restore the same theme preference from localStorage.

**Validates: Requirements 4.5**

### Property 13: Documentation completeness

*For any* Component_Library component, the documentation should include all props with their types and default values, at least 3 usage examples, all variants documented, and accessibility guidelines.

**Validates: Requirements 5.2, 5.3, 5.4, 5.5**

### Property 14: Props affect rendering

*For any* Component_Library component and any prop that component accepts, changing that prop's value should result in a corresponding change in the rendered output or behavior.

**Validates: Requirements 6.2**

### Property 15: ARIA attributes presence

*For any* Component_Library component, all interactive elements should have appropriate ARIA roles, labels, and states that accurately describe their purpose and current state.

**Validates: Requirements 6.4, 7.2**

### Property 16: Callback invocation

*For any* interactive component with callback props (onClick, onSelect, onDismiss, etc.), when the corresponding user interaction occurs, the callback should be invoked with the correct arguments.

**Validates: Requirements 6.5**

### Property 17: Focus indicator visibility

*For any* focusable component, when the component receives focus, a visible focus indicator should be displayed with at least 3:1 contrast ratio against the background.

**Validates: Requirements 7.3, 7.5**

### Property 18: Form input label association

*For any* form input component (Input, Checkbox, Select), the input should have an associated label either through a label element, aria-label, or aria-labelledby attribute.

**Validates: Requirements 7.6**

### Property 19: Image text alternatives

*For any* component that renders images or icons (Avatar, Alert, Button with icon), each image or icon should have a text alternative through alt text, aria-label, or aria-hidden (if decorative).

**Validates: Requirements 7.7**

### Property 20: Theme change selective re-rendering

*For any* theme change, only components that consume theme tokens should re-render; components that don't use theme tokens should not re-render.

**Validates: Requirements 8.4**

### Property 21: Render props pattern support

*For any* component that accepts render props, passing a function as a prop should result in that function being called with the appropriate arguments and its return value being rendered.

**Validates: Requirements 9.2**

### Property 22: Children as function pattern support

*For any* component that supports children as a function, passing a function as children should result in that function being called with the appropriate arguments and its return value being rendered.

**Validates: Requirements 9.3**

### Property 23: Size naming consistency

*For any* component that supports size variants, the component should accept the standard size names (xs, sm, md, lg, xl) and render with the appropriate dimensions.

**Validates: Requirements 10.2**

### Property 24: Invalid variant fallback

*For any* component with variant props, when an invalid variant value is provided, the component should log a warning to the console and render using the default variant.

**Validates: Requirements 10.3**

### Property 25: Variant documentation completeness

*For any* component that supports variants, the documentation should describe the visual appearance and use case for each variant.

**Validates: Requirements 10.4**

## Error Handling

### Component Error Boundaries

All components should handle errors gracefully without crashing the entire application:

1. **Invalid Props**: Components should validate props and log warnings for invalid values, falling back to defaults
2. **Missing Required Props**: Components should throw descriptive errors during development but handle gracefully in production
3. **Image Loading Failures**: Avatar component should cascade through fallbacks (image → initials → icon)
4. **Theme Token Missing**: Components should fall back to hardcoded defaults if theme tokens are unavailable
5. **Callback Errors**: Components should wrap callback invocations in try-catch to prevent crashes

### Error Logging Strategy

```javascript
// Development: Log warnings for invalid props
if (process.env.NODE_ENV === 'development') {
  if (!validVariants.includes(variant)) {
    console.warn(
      `Invalid variant "${variant}" provided to ${componentName}. ` +
      `Valid variants are: ${validVariants.join(', ')}. ` +
      `Falling back to default variant.`
    );
  }
}

// Production: Silent fallback to defaults
const safeVariant = validVariants.includes(variant) ? variant : 'primary';
```

### Accessibility Error Prevention

1. **Missing Labels**: Input components should warn if neither label, aria-label, nor aria-labelledby is provided
2. **Invalid ARIA**: Components should validate ARIA attribute values against allowed values
3. **Focus Management**: Modal and Dropdown should trap focus and restore it on close
4. **Keyboard Traps**: All components should allow Escape key to exit interactive states

## Testing Strategy

### Dual Testing Approach

The component library uses both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples and edge cases
- Integration between components
- Error conditions and fallback behavior
- Accessibility attributes and keyboard navigation
- Visual regression (snapshot tests)

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Invariants that should never be violated
- Round-trip properties (e.g., theme serialization)

Together, unit tests catch concrete bugs while property tests verify general correctness across all possible inputs.

### Testing Tools

- **Unit Testing**: React Testing Library + Vitest
- **Property-Based Testing**: fast-check library
- **Accessibility Testing**: axe-core + jest-axe
- **Coverage**: Vitest coverage (target: 90%+)

### Property-Based Testing Configuration

Each property test will:
- Run minimum 100 iterations to ensure comprehensive coverage
- Use fast-check generators for randomized inputs
- Tag tests with comments referencing design properties
- Tag format: `// Feature: component-library-completion, Property {number}: {property_text}`

Example property test:

```javascript
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { Button } from './Button';

// Feature: component-library-completion, Property 4: Variant rendering consistency
test('all button variants render with correct theme colors', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('primary', 'secondary', 'success', 'danger', 'warning', 'info', 'ghost'),
      (variant) => {
        const { container } = render(<Button variant={variant}>Click me</Button>);
        const button = container.querySelector('button');
        
        // Verify button has classes corresponding to the variant
        const variantClasses = getVariantClasses(variant);
        variantClasses.forEach(cls => {
          expect(button.classList.contains(cls)).toBe(true);
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Test Structure

Each component test file should include:

1. **Rendering Tests**: Verify component renders without errors
2. **Props Tests**: Verify each prop affects rendering correctly
3. **Interaction Tests**: Verify user interactions work correctly
4. **Keyboard Tests**: Verify keyboard navigation works
5. **Accessibility Tests**: Verify ARIA attributes and roles
6. **Error Tests**: Verify error handling and fallbacks

Example unit test structure:

```javascript
describe('Tooltip', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => { /* ... */ });
    it('renders tooltip content on hover', () => { /* ... */ });
  });
  
  describe('Positioning', () => {
    it('positions tooltip at top when position="top"', () => { /* ... */ });
    it('positions tooltip at bottom when position="bottom"', () => { /* ... */ });
    // ... other positions
  });
  
  describe('Keyboard Navigation', () => {
    it('shows tooltip on focus', () => { /* ... */ });
    it('hides tooltip on Escape key', () => { /* ... */ });
  });
  
  describe('Accessibility', () => {
    it('has role="tooltip"', () => { /* ... */ });
    it('connects tooltip to trigger with aria-describedby', () => { /* ... */ });
    it('passes axe accessibility tests', async () => {
      const { container } = render(<Tooltip content="Test">Button</Tooltip>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
```

### Migration Testing Strategy

For application component migration:

1. **Visual Regression**: Take screenshots before and after migration
2. **Functionality Tests**: Verify all interactions still work
3. **Accessibility Tests**: Verify accessibility is maintained or improved
4. **Performance Tests**: Verify no performance degradation

### Test Coverage Requirements

- **Component Library**: 90%+ coverage
- **Theme System**: 95%+ coverage
- **Critical Paths**: 100% coverage (theme switching, accessibility features)

### Continuous Testing

- Run tests on every commit (pre-commit hook)
- Run full test suite in CI/CD pipeline
- Run accessibility audit weekly
- Monitor bundle size on every build

## Performance Optimization

### Code Splitting and Lazy Loading

Heavy components will be lazy-loaded to reduce initial bundle size:

```javascript
// Lazy load Modal component
const Modal = React.lazy(() => import('./ui/Modal'));

// Lazy load Dropdown component
const Dropdown = React.lazy(() => import('./ui/Dropdown'));

// Usage with Suspense
<Suspense fallback={<Spinner />}>
  <Modal open={isOpen} onClose={handleClose}>
    {/* Modal content */}
  </Modal>
</Suspense>
```

### Memoization Strategy

Components will use React.memo for optimization:

```javascript
// Memoize components that receive stable props
export default React.memo(Button, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.variant === nextProps.variant &&
    prevProps.size === nextProps.size &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.loading === nextProps.loading
  );
});
```

### Theme Context Optimization

The theme context will use a selector pattern to prevent unnecessary re-renders:

```javascript
// Only re-render when specific theme values change
const ThemeContext = React.createContext();

export const useTheme = (selector) => {
  const theme = React.useContext(ThemeContext);
  return selector ? selector(theme) : theme;
};

// Usage: Only re-render when primary color changes
const primaryColor = useTheme(theme => theme.colors.primary);
```

### Bundle Size Optimization

Target: Under 50KB gzipped for entire component library

Strategies:
1. Tree-shaking: Use named exports for all components
2. Minimize dependencies: Use Radix UI primitives (already tree-shakeable)
3. CSS-in-JS: Use Tailwind classes (purged in production)
4. Icon optimization: Use lucide-react with tree-shaking
5. Code splitting: Lazy load heavy components

### Performance Monitoring

```javascript
// Monitor component render times in development
if (process.env.NODE_ENV === 'development') {
  const startTime = performance.now();
  
  // Component render
  
  const endTime = performance.now();
  if (endTime - startTime > 16) {
    console.warn(`${componentName} render took ${endTime - startTime}ms (target: <16ms)`);
  }
}
```

## Documentation Structure

### Component Documentation Template

Each component will have a markdown file following this structure:

```markdown
# ComponentName

Brief description of the component and its purpose.

## Installation

\`\`\`bash
import { ComponentName } from '@/components/ui';
\`\`\`

## Basic Usage

\`\`\`jsx
<ComponentName prop="value">
  Content
</ComponentName>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| prop1 | string | 'default' | Description of prop1 |
| prop2 | boolean | false | Description of prop2 |

## Variants

### Primary
Description and use case for primary variant.

\`\`\`jsx
<ComponentName variant="primary">Primary</ComponentName>
\`\`\`

### Secondary
Description and use case for secondary variant.

## Sizes

Available sizes: xs, sm, md (default), lg, xl

## Examples

### Example 1: Basic Usage
\`\`\`jsx
// Code example
\`\`\`

### Example 2: Advanced Usage
\`\`\`jsx
// Code example
\`\`\`

### Example 3: With Other Components
\`\`\`jsx
// Code example
\`\`\`

## Accessibility

- Keyboard navigation: [describe keyboard shortcuts]
- ARIA attributes: [list ARIA attributes used]
- Screen reader support: [describe screen reader behavior]
- Focus management: [describe focus behavior]

## Best Practices

- When to use this component
- Common patterns
- Things to avoid

## Related Components

- [Link to related component 1]
- [Link to related component 2]
```

### Documentation Files

```
frontend/docs/
├── getting-started.md           # Installation and setup
├── theme-system.md              # Theme customization guide
├── accessibility.md             # Accessibility guidelines
├── migration-guide.md           # Migration from ad-hoc styling
└── components/
    ├── Button.md
    ├── Card.md
    ├── Tooltip.md
    ├── Dropdown.md
    ├── Tabs.md
    ├── Toast.md
    ├── Spinner.md
    ├── Alert.md
    ├── Avatar.md
    ├── Progress.md
    ├── Stack.md
    ├── Grid.md
    └── Flex.md
```

### Getting Started Guide Content

The getting started guide will include:

1. **Installation**: How to import and use components
2. **Theme Setup**: How to wrap app with ThemeProvider
3. **Basic Examples**: Simple usage examples for each component
4. **Customization**: How to customize theme tokens
5. **Dark Mode**: How to implement dark mode toggle
6. **Accessibility**: Overview of accessibility features
7. **Best Practices**: Common patterns and anti-patterns

### Interactive Documentation

Future enhancement: Create an interactive documentation site using:
- Storybook for component playground
- Live code editor for examples
- Visual variant showcase
- Accessibility testing results

## Migration Implementation Plan

### Phase 1: Theme System (Week 1)

**Tasks:**
1. Create theme token configuration
2. Implement ThemeProvider component
3. Implement useTheme hook
4. Add localStorage persistence
5. Update existing 7 components to use theme tokens
6. Test theme switching functionality

**Success Criteria:**
- All existing components use theme tokens
- Theme switches without page reload
- Preference persists across sessions

### Phase 2: New Components (Week 2-3)

**Tasks:**
1. Implement Tooltip component with tests and docs
2. Implement Dropdown component with tests and docs
3. Implement Tabs component with tests and docs
4. Implement Toast component with tests and docs
5. Implement Spinner component with tests and docs
6. Implement Alert component with tests and docs
7. Implement Avatar component with tests and docs
8. Implement Progress component with tests and docs
9. Implement layout components (Stack, Grid, Flex)

**Success Criteria:**
- All 8 new components implemented
- 90%+ test coverage for new components
- All components pass accessibility audit
- Documentation complete for all components

### Phase 3: Application Migration (Week 4-5)

**Tasks:**
1. Audit all application components for ad-hoc styling
2. Create migration checklist
3. Migrate simple components (10 components)
4. Migrate medium complexity components (10 components)
5. Migrate complex components (10 components)
6. Test all migrated components
7. Visual regression testing

**Success Criteria:**
- Zero ad-hoc styling in application components
- All functionality preserved
- No visual regressions
- Accessibility maintained or improved

### Phase 4: Optimization & Documentation (Week 6)

**Tasks:**
1. Implement lazy loading for heavy components
2. Optimize bundle size
3. Complete all documentation
4. Run final accessibility audit
5. Performance testing
6. Create migration guide

**Success Criteria:**
- Bundle size under 50KB gzipped
- All documentation complete
- Zero accessibility violations
- Performance targets met

## Dark Mode Implementation Details

### Color Token Strategy

Each color token has both light and dark values:

```javascript
const colors = {
  primary: {
    light: '#4F46E5',  // indigo-600
    dark: '#6366F1'    // indigo-500 (lighter for dark bg)
  }
};
```

### CSS Variable Approach

Theme tokens are exposed as CSS variables for easy consumption:

```javascript
// ThemeProvider sets CSS variables on :root
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  
  useEffect(() => {
    const root = document.documentElement;
    const tokens = themeTokens.colors;
    
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value[theme]);
    });
  }, [theme]);
  
  // ...
};
```

### Transition Smoothness

All color transitions use CSS transitions:

```css
* {
  transition: background-color 200ms ease-in-out,
              color 200ms ease-in-out,
              border-color 200ms ease-in-out;
}
```

### System Preference Detection

Detect and respect system dark mode preference:

```javascript
const getInitialTheme = () => {
  // Check localStorage first
  const stored = localStorage.getItem('theme');
  if (stored) return stored;
  
  // Fall back to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};
```

### Dark Mode Toggle Component

```javascript
const DarkModeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      icon={theme === 'dark' ? Sun : Moon}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? 'Light' : 'Dark'} Mode
    </Button>
  );
};
```

## Accessibility Implementation Details

### Keyboard Navigation Standards

All components follow these keyboard navigation standards:

- **Tab**: Move focus to next focusable element
- **Shift+Tab**: Move focus to previous focusable element
- **Enter/Space**: Activate buttons and controls
- **Escape**: Close modals, dropdowns, tooltips
- **Arrow Keys**: Navigate within component (tabs, dropdown items)
- **Home/End**: Jump to first/last item in lists

### Focus Management

Components manage focus appropriately:

1. **Modal**: Traps focus within modal, restores focus on close
2. **Dropdown**: Moves focus to first item on open, restores on close
3. **Tabs**: Manages focus between tab triggers and panels
4. **Tooltip**: Shows on focus, hides on blur

### ARIA Patterns

Each component follows WAI-ARIA authoring practices:

- **Button**: role="button" (implicit), aria-pressed for toggles
- **Modal**: role="dialog", aria-modal="true", aria-labelledby
- **Dropdown**: role="menu", role="menuitem", aria-expanded
- **Tabs**: role="tablist", role="tab", role="tabpanel", aria-selected
- **Alert**: role="alert" (errors), role="status" (info)
- **Progress**: role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax
- **Tooltip**: role="tooltip", aria-describedby

### Screen Reader Testing

All components will be tested with:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)

### Color Contrast Requirements

All text must meet WCAG 2.1 AA standards:
- Normal text (< 18pt): 4.5:1 contrast ratio
- Large text (≥ 18pt or ≥ 14pt bold): 3:1 contrast ratio
- UI components and graphics: 3:1 contrast ratio

Contrast ratios will be verified using automated tools and manual testing.

## Risk Assessment

### Technical Risks

1. **Breaking Changes**: Migrating existing components may break functionality
   - Mitigation: Comprehensive testing, visual regression tests, gradual rollout

2. **Performance Degradation**: Theme context may cause unnecessary re-renders
   - Mitigation: Use selector pattern, memoization, performance monitoring

3. **Bundle Size**: Adding 8 new components may increase bundle size
   - Mitigation: Lazy loading, tree-shaking, code splitting

4. **Accessibility Regressions**: Migration may introduce accessibility issues
   - Mitigation: Automated accessibility testing, manual testing with screen readers

### Timeline Risks

1. **Scope Creep**: Migration of 30+ components may take longer than estimated
   - Mitigation: Prioritize critical components, phase migration

2. **Testing Overhead**: Comprehensive testing may slow development
   - Mitigation: Parallel testing, automated test generation

### Dependency Risks

1. **Radix UI Updates**: Breaking changes in Radix UI may affect components
   - Mitigation: Pin versions, test updates in isolation

2. **Tailwind CSS Updates**: Changes to Tailwind may affect styling
   - Mitigation: Pin versions, use theme tokens as abstraction layer

## Success Metrics

### Quantitative Metrics

- **Test Coverage**: ≥ 90% for component library
- **Bundle Size**: ≤ 50KB gzipped
- **Accessibility**: Zero violations in axe-core audit
- **Performance**: < 16ms initial render for all components
- **Migration**: 100% of application components using design system

### Qualitative Metrics

- **Developer Experience**: Positive feedback from team on component APIs
- **Consistency**: Visual consistency across all application screens
- **Maintainability**: Reduced time to implement new features
- **Accessibility**: Positive feedback from accessibility audit

### Monitoring

- Track component usage across application
- Monitor bundle size on every build
- Run accessibility audits weekly
- Collect developer feedback monthly
- Track time to implement new features

## Future Enhancements

### Phase 2 (Future Spec)

- Storybook integration for interactive documentation
- Visual regression testing with Percy or Chromatic
- Component animation library
- Advanced layout components (Masonry, Carousel)
- Form validation components
- Data table component with sorting/filtering
- Chart components for analytics

### Phase 3 (Future Spec)

- Internationalization support
- Right-to-left (RTL) language support
- High contrast mode for accessibility
- Reduced motion mode for accessibility
- Component theming API for white-labeling
- Design token export for design tools (Figma)

---

This design provides a comprehensive foundation for completing the component library while maintaining consistency, accessibility, and performance. The phased approach minimizes risk while delivering value incrementally.
