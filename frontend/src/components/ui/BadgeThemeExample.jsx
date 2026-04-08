import React from 'react';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';
import Badge from './Badge';

/**
 * Badge Theme Example Component
 * 
 * Demonstrates the Badge component using theme tokens in both light and dark modes.
 * This example validates Requirements 3.5, 4.1, and 10.1.
 * 
 * Usage:
 * Import this component in your app to see Badge variants in action.
 */

const BadgeExampleContent = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Badge Component - Theme Integration</h1>
            <p className="text-[var(--color-text-secondary)]">
              All badges use theme tokens and adapt to light/dark mode
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:brightness-90 transition-all"
          >
            Toggle to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>

        {/* Current Theme Indicator */}
        <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <p className="text-sm font-medium">
            Current Theme: <Badge variant="primary">{theme}</Badge>
          </p>
        </div>

        {/* All Variants */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">All Variants</h2>
          <div className="p-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </div>
        </section>

        {/* All Sizes */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">All Sizes</h2>
          <div className="p-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="primary" size="xs">Extra Small</Badge>
              <Badge variant="primary" size="sm">Small</Badge>
              <Badge variant="primary" size="md">Medium</Badge>
              <Badge variant="primary" size="lg">Large</Badge>
            </div>
          </div>
        </section>

        {/* With Dot Indicator */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">With Dot Indicator</h2>
          <div className="p-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" dot>Offline</Badge>
              <Badge variant="success" dot>Online</Badge>
              <Badge variant="warning" dot>Away</Badge>
              <Badge variant="danger" dot>Busy</Badge>
              <Badge variant="info" dot>In Meeting</Badge>
            </div>
          </div>
        </section>

        {/* Real-world Examples */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Real-world Examples</h2>
          <div className="space-y-4">
            {/* Status Example */}
            <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">API Service Status</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">All systems operational</p>
                </div>
                <Badge variant="success" dot>Healthy</Badge>
              </div>
            </div>

            {/* Priority Example */}
            <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Critical Bug Report</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">Requires immediate attention</p>
                </div>
                <Badge variant="danger">High Priority</Badge>
              </div>
            </div>

            {/* Category Example */}
            <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <div>
                <h3 className="font-semibold mb-2">Article Tags</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary" size="sm">React</Badge>
                  <Badge variant="info" size="sm">JavaScript</Badge>
                  <Badge variant="success" size="sm">Tutorial</Badge>
                  <Badge variant="secondary" size="sm">Frontend</Badge>
                </div>
              </div>
            </div>

            {/* Notification Example */}
            <div className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">You have unread messages</p>
                </div>
                <Badge variant="danger" size="sm">12</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Theme Token Information */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Theme Token Usage</h2>
          <div className="p-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              All badges use CSS variables from the theme system:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="primary" size="sm">Primary</Badge>
                <code className="text-xs bg-[var(--color-background)] px-2 py-1 rounded border border-[var(--color-border)]">
                  var(--color-primary)
                </code>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="success" size="sm">Success</Badge>
                <code className="text-xs bg-[var(--color-background)] px-2 py-1 rounded border border-[var(--color-border)]">
                  var(--color-success)
                </code>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="danger" size="sm">Danger</Badge>
                <code className="text-xs bg-[var(--color-background)] px-2 py-1 rounded border border-[var(--color-border)]">
                  var(--color-danger)
                </code>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="warning" size="sm">Warning</Badge>
                <code className="text-xs bg-[var(--color-background)] px-2 py-1 rounded border border-[var(--color-border)]">
                  var(--color-warning)
                </code>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="info" size="sm">Info</Badge>
                <code className="text-xs bg-[var(--color-background)] px-2 py-1 rounded border border-[var(--color-border)]">
                  var(--color-info)
                </code>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

const BadgeThemeExample = () => {
  return (
    <ThemeProvider>
      <BadgeExampleContent />
    </ThemeProvider>
  );
};

export default BadgeThemeExample;
