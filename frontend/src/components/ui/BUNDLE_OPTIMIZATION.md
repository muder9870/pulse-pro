# Bundle Size Optimization Guide

## Overview

This guide documents the bundle size optimization strategies implemented in the AI Pulse Pro component library and provides recommendations for maintaining optimal bundle size.

## Current Optimizations

### 1. Named Exports for Tree-Shaking

The component library uses named exports in the barrel file (`index.js`) to enable tree-shaking:

```javascript
// ✅ Good: Named exports enable tree-shaking
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Badge } from './Badge';

// ❌ Bad: Default export of object prevents tree-shaking
export default {
  Button,
  Card,
  Badge,
};
```

**Impact**: Only imported components are included in the final bundle.

### 2. React.memo for Component Memoization

Components with stable props are wrapped with `React.memo` to prevent unnecessary re-renders:

- Badge
- Spinner
- Progress
- Alert
- Avatar
- Card (and all sub-components)

**Impact**: Reduces runtime performance overhead and improves rendering efficiency.

### 3. React.forwardRef for Ref Forwarding

Components that may need ref access use `React.forwardRef`:

- Button
- Input
- Checkbox
- Select
- Stack
- Grid
- Flex
- Card
- Badge
- Alert

**Impact**: Enables ref forwarding without wrapper components, reducing component tree depth.

### 4. Minimal Dependencies

The component library uses minimal external dependencies:

- **Radix UI primitives**: Tree-shakeable, only used components are bundled
- **lucide-react**: Tree-shakeable icon library, only imported icons are bundled
- **Tailwind CSS**: Purged in production, only used classes are included

**Impact**: Reduces overall bundle size by avoiding heavy dependencies.

### 5. CSS-in-JS via Tailwind

Using Tailwind CSS classes instead of runtime CSS-in-JS libraries:

```javascript
// ✅ Good: Tailwind classes (purged in production)
className="px-4 py-2 bg-blue-500 text-white rounded-lg"

// ❌ Bad: Runtime CSS-in-JS (adds bundle size)
const styles = css`
  padding: 1rem;
  background: blue;
  color: white;
  border-radius: 0.5rem;
`;
```

**Impact**: Zero runtime CSS-in-JS overhead, smaller bundle size.

## Bundle Size Targets

### Component Library Target: < 50KB gzipped

Current estimated sizes (gzipped):

- **Core components** (Button, Card, Badge, Input, Checkbox, Select): ~8KB
- **Layout components** (Stack, Grid, Flex): ~4KB
- **Feedback components** (Alert, Toast, Spinner, Progress): ~6KB
- **Overlay components** (Modal, Dropdown, Tooltip, Tabs): ~12KB
- **Avatar component**: ~2KB
- **Theme system**: ~2KB

**Total estimated**: ~34KB gzipped (well under 50KB target)

## Best Practices for Maintaining Small Bundle Size

### 1. Import Only What You Need

```javascript
// ✅ Good: Import only needed components
import { Button, Card } from '@/components/ui';

// ❌ Bad: Import entire library
import * as UI from '@/components/ui';
```

### 2. Use Dynamic Imports for Heavy Components

```javascript
// ✅ Good: Lazy load heavy components
const Modal = lazy(() => import('@/components/ui/Modal'));

// ❌ Bad: Import all components upfront
import { Modal } from '@/components/ui';
```

### 3. Avoid Importing Entire Icon Libraries

```javascript
// ✅ Good: Import specific icons
import { Check, X, AlertCircle } from 'lucide-react';

// ❌ Bad: Import all icons
import * as Icons from 'lucide-react';
```

### 4. Use Tailwind's Purge Configuration

Ensure Tailwind is configured to purge unused styles in production:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  // ... other config
};
```

### 5. Analyze Bundle Size Regularly

Use bundle analysis tools to monitor bundle size:

```bash
# Build with bundle analysis
npm run build -- --analyze

# Or use webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer
```

## Monitoring Bundle Size

### 1. Set Up Bundle Size Checks

Add bundle size checks to your CI/CD pipeline:

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "analyze": "vite build --mode analyze",
    "size": "size-limit"
  },
  "size-limit": [
    {
      "path": "dist/assets/*.js",
      "limit": "50 KB"
    }
  ]
}
```

### 2. Monitor Component Sizes

Track individual component sizes:

```bash
# List all component files with sizes
ls -lh src/components/ui/*.jsx

# Check gzipped sizes
gzip -c src/components/ui/Button.jsx | wc -c
```

### 3. Use Lighthouse for Performance Audits

Run Lighthouse audits to check bundle size impact on performance:

```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse https://your-app.com --view
```

## Advanced Optimizations

### 1. Code Splitting by Route

Split code by route to reduce initial bundle size:

```javascript
// App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### 2. Preload Critical Components

Preload components that will be needed soon:

```javascript
// Preload Modal component when user hovers over button
const handleMouseEnter = () => {
  import('@/components/ui/Modal');
};

<button onMouseEnter={handleMouseEnter}>Open Modal</button>
```

### 3. Use Production Builds

Always use production builds for deployment:

```bash
# Build for production
npm run build

# Verify production build
NODE_ENV=production npm run build
```

### 4. Enable Compression

Enable gzip or brotli compression on your server:

```nginx
# nginx configuration
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1000;
```

## Troubleshooting Large Bundles

### 1. Identify Large Dependencies

Use bundle analyzer to identify large dependencies:

```bash
npm run build -- --analyze
```

Look for:
- Duplicate dependencies
- Large libraries that could be replaced
- Unused code that should be removed

### 2. Check for Circular Dependencies

Circular dependencies can prevent tree-shaking:

```bash
# Install circular dependency checker
npm install --save-dev circular-dependency-plugin

# Add to webpack config
const CircularDependencyPlugin = require('circular-dependency-plugin');

module.exports = {
  plugins: [
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      failOnError: true,
    }),
  ],
};
```

### 3. Verify Tree-Shaking

Check that tree-shaking is working:

```bash
# Build and check for unused exports
npm run build

# Search for unused exports in bundle
grep -r "unused harmony export" dist/
```

## Performance Metrics

### Target Metrics

- **Initial Bundle Size**: < 200KB gzipped (entire app)
- **Component Library**: < 50KB gzipped
- **Time to Interactive (TTI)**: < 3 seconds
- **First Contentful Paint (FCP)**: < 1.5 seconds

### Measuring Performance

```javascript
// Measure component render time
if (process.env.NODE_ENV === 'development') {
  const startTime = performance.now();
  
  // Component render
  
  const endTime = performance.now();
  if (endTime - startTime > 16) {
    console.warn(`Component render took ${endTime - startTime}ms (target: <16ms)`);
  }
}
```

## Summary

The component library is optimized for minimal bundle size through:

1. ✅ Named exports for tree-shaking
2. ✅ React.memo for component memoization
3. ✅ React.forwardRef for ref forwarding
4. ✅ Minimal dependencies (Radix UI, lucide-react)
5. ✅ Tailwind CSS with purging
6. ✅ Lazy loading recommendations
7. ✅ Bundle size monitoring

**Current Status**: ~34KB gzipped (under 50KB target) ✅

Continue monitoring bundle size and follow best practices to maintain optimal performance.
