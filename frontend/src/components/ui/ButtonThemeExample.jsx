import React from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import Button from './Button';
import { Download, Trash2, AlertCircle, Info, CheckCircle } from 'lucide-react';

/**
 * Example component demonstrating Button component with theme tokens
 * Shows all variants in both light and dark modes
 */
const ButtonThemeExample = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 space-y-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Button Component - Theme Integration
        </h1>
        
        <div className="flex items-center gap-4">
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Current theme: <strong>{theme}</strong>
          </p>
          
          <Button onClick={toggleTheme} variant="primary">
            Toggle Theme
          </Button>
        </div>
      </div>

      {/* All Variants */}
      <div
        className="p-6 rounded-lg space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          All Button Variants
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          All variants now use theme tokens and adapt to light/dark mode automatically.
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="success">Success</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="info">Info</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>

      {/* With Icons */}
      <div
        className="p-6 rounded-lg space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Buttons with Icons
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon={Download}>
            Download
          </Button>
          <Button variant="danger" icon={Trash2}>
            Delete
          </Button>
          <Button variant="warning" icon={AlertCircle}>
            Warning
          </Button>
          <Button variant="info" icon={Info}>
            Information
          </Button>
          <Button variant="success" icon={CheckCircle}>
            Confirm
          </Button>
        </div>
      </div>

      {/* All Sizes */}
      <div
        className="p-6 rounded-lg space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Button Sizes
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="xs">Extra Small</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" size="xl">Extra Large</Button>
        </div>
      </div>

      {/* States */}
      <div
        className="p-6 rounded-lg space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Button States
        </h2>
        
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Normal</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="primary" loading>Loading</Button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary">Normal</Button>
            <Button variant="secondary" disabled>Disabled</Button>
            <Button variant="secondary" loading>Loading</Button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="danger">Normal</Button>
            <Button variant="danger" disabled>Disabled</Button>
            <Button variant="danger" loading>Loading</Button>
          </div>
        </div>
      </div>

      {/* Full Width */}
      <div
        className="p-6 rounded-lg space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Full Width Buttons
        </h2>
        
        <div className="space-y-2">
          <Button variant="primary" fullWidth>Primary Full Width</Button>
          <Button variant="secondary" fullWidth>Secondary Full Width</Button>
          <Button variant="success" fullWidth icon={CheckCircle}>
            Success with Icon
          </Button>
        </div>
      </div>

      {/* Theme Features */}
      <div
        className="p-6 rounded-lg"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderLeft: '4px solid var(--color-primary)',
        }}
      >
        <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Theme Integration Features
        </h2>
        <ul className="space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li>✓ All variants use CSS variables from theme tokens</li>
          <li>✓ Automatic adaptation to light/dark mode</li>
          <li>✓ Smooth color transitions (200ms)</li>
          <li>✓ WCAG 2.1 AA compliant contrast ratios</li>
          <li>✓ Invalid variant fallback with development warnings</li>
          <li>✓ Consistent hover and focus states across themes</li>
        </ul>
      </div>

      {/* Color Reference */}
      <div
        className="p-6 rounded-lg space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Theme Color Reference
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Current theme colors being used by buttons:
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['primary', 'secondary', 'success', 'danger', 'warning', 'info'].map((color) => (
            <div key={color} className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded border"
                style={{
                  backgroundColor: `var(--color-${color})`,
                  borderColor: 'var(--color-border)',
                }}
              />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {color}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  --color-{color}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ButtonThemeExample;
