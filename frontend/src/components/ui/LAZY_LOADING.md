# Lazy Loading Guide for Component Library

## Overview

This guide explains how to implement lazy loading for heavy components in the AI Pulse Pro component library to optimize bundle size and initial load performance.

## Why Lazy Loading?

Lazy loading allows you to split your application code into smaller chunks that are loaded on-demand, reducing the initial bundle size and improving page load times. This is especially beneficial for:

- Components that are conditionally rendered (modals, dropdowns, toasts)
- Components that are not immediately visible on page load
- Heavy components with large dependencies

## Components Recommended for Lazy Loading

### 1. Modal Component

Modals are typically not visible on initial page load and are only shown when triggered by user interaction.

```jsx
import React, { Suspense, lazy } from 'react';
import { Spinner } from '@/components/ui';

// Lazy load the Modal component
const Modal = lazy(() => import('@/components/ui/Modal'));

function MyComponent() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      
      {isOpen && (
        <Suspense fallback={<Spinner />}>
          <Modal open={isOpen} onClose={() => setIsOpen(false)}>
            <Modal.Header>
              <Modal.Title>My Modal</Modal.Title>
            </Modal.Header>
            <Modal.Content>
              <p>Modal content goes here</p>
            </Modal.Content>
          </Modal>
        </Suspense>
      )}
    </>
  );
}
```

### 2. Dropdown Component

Dropdowns are conditionally rendered and can benefit from lazy loading.

```jsx
import React, { Suspense, lazy } from 'react';

// Lazy load the Dropdown component
const Dropdown = lazy(() => import('@/components/ui/Dropdown'));

function MyComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dropdown trigger={<button>Actions</button>}>
        <Dropdown.Item onSelect={() => console.log('Edit')}>Edit</Dropdown.Item>
        <Dropdown.Item onSelect={() => console.log('Delete')}>Delete</Dropdown.Item>
      </Dropdown>
    </Suspense>
  );
}
```

### 3. Toast Component

Toast notifications are typically not visible on initial page load.

```jsx
import React, { Suspense, lazy } from 'react';

// Lazy load the Toast component
const Toast = lazy(() => import('@/components/ui/Toast'));

function MyComponent() {
  const [showToast, setShowToast] = React.useState(false);

  return (
    <>
      <button onClick={() => setShowToast(true)}>Show Toast</button>
      
      {showToast && (
        <Suspense fallback={null}>
          <Toast
            variant="success"
            title="Success"
            description="Operation completed successfully"
            onClose={() => setShowToast(false)}
          />
        </Suspense>
      )}
    </>
  );
}
```

### 4. Tabs Component

Tabs can be lazy loaded if they contain heavy content or are not immediately visible.

```jsx
import React, { Suspense, lazy } from 'react';
import { Spinner } from '@/components/ui';

// Lazy load the Tabs component
const Tabs = lazy(() => import('@/components/ui/Tabs'));

function MyComponent() {
  return (
    <Suspense fallback={<Spinner />}>
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview">Overview content</Tabs.Content>
        <Tabs.Content value="analytics">Analytics content</Tabs.Content>
      </Tabs>
    </Suspense>
  );
}
```

## Best Practices

### 1. Use Appropriate Fallbacks

Always provide a fallback UI that matches the expected size and layout of the lazy-loaded component to prevent layout shifts.

```jsx
// Good: Fallback matches expected size
<Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
  <Modal />
</Suspense>

// Bad: No fallback or mismatched size
<Suspense fallback={null}>
  <Modal />
</Suspense>
```

### 2. Preload on User Intent

For better UX, preload components when the user shows intent to use them (e.g., hovering over a button).

```jsx
import React, { Suspense, lazy } from 'react';

const Modal = lazy(() => import('@/components/ui/Modal'));

function MyComponent() {
  const [isOpen, setIsOpen] = React.useState(false);

  // Preload Modal when user hovers over the button
  const handleMouseEnter = () => {
    import('@/components/ui/Modal');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={handleMouseEnter}
      >
        Open Modal
      </button>
      
      {isOpen && (
        <Suspense fallback={<Spinner />}>
          <Modal open={isOpen} onClose={() => setIsOpen(false)}>
            Modal content
          </Modal>
        </Suspense>
      )}
    </>
  );
}
```

### 3. Group Related Components

If multiple components are always used together, consider lazy loading them as a group.

```jsx
// components/modals/index.js
export { default as UserModal } from './UserModal';
export { default as SettingsModal } from './SettingsModal';
export { default as ConfirmModal } from './ConfirmModal';

// Usage
const Modals = lazy(() => import('@/components/modals'));

<Suspense fallback={<Spinner />}>
  <Modals.UserModal />
</Suspense>
```

### 4. Avoid Over-Lazy-Loading

Don't lazy load components that are:
- Always visible on initial page load
- Very small in size (< 10KB)
- Critical for the initial user experience

Components like Button, Badge, Spinner, and Card should NOT be lazy loaded as they are:
- Small in size
- Frequently used throughout the application
- Often needed immediately on page load

## Performance Monitoring

Monitor the impact of lazy loading on your application:

1. **Bundle Size**: Check that lazy loading reduces the initial bundle size
2. **Load Time**: Measure the time to interactive (TTI) before and after lazy loading
3. **User Experience**: Ensure fallback UIs don't cause jarring layout shifts

```bash
# Analyze bundle size
npm run build -- --analyze

# Check bundle sizes
ls -lh dist/assets/*.js
```

## Route-Based Code Splitting

For larger applications, consider route-based code splitting in addition to component-level lazy loading:

```jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Spinner } from '@/components/ui';

// Lazy load route components
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Settings = lazy(() => import('@/pages/Settings'));
const Analytics = lazy(() => import('@/pages/Analytics'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

## Summary

Lazy loading is a powerful optimization technique that can significantly improve your application's initial load time. Focus on lazy loading:

1. **Conditionally rendered components** (Modal, Dropdown, Toast)
2. **Heavy components** with large dependencies
3. **Route-level components** for different pages

Always provide appropriate fallbacks and monitor the impact on user experience.
