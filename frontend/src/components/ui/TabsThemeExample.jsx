import React, { useState } from 'react';
import Tabs from './Tabs';
import Card from './Card';

/**
 * TabsThemeExample - Demonstrates Tabs component usage
 * 
 * This example shows:
 * - Uncontrolled mode with defaultValue
 * - Controlled mode with value and onValueChange
 * - Disabled tabs
 * - Integration with Card component
 * - Theme token usage (automatically supports light/dark mode)
 */
const TabsThemeExample = () => {
  const [controlledTab, setControlledTab] = useState('profile');

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        Tabs Component Examples
      </h1>

      {/* Example 1: Uncontrolled Tabs */}
      <Card>
        <Card.Header>
          <Card.Title>Uncontrolled Tabs (defaultValue)</Card.Title>
          <Card.Description>
            Tabs manage their own state with defaultValue prop
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
              <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
              <Tabs.Trigger value="reports">Reports</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="overview">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Overview</h3>
                <p className="text-[var(--color-text-secondary)]">
                  This is the overview tab content. It provides a high-level summary
                  of your dashboard metrics and key performance indicators.
                </p>
              </div>
            </Tabs.Content>
            <Tabs.Content value="analytics">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Analytics</h3>
                <p className="text-[var(--color-text-secondary)]">
                  Detailed analytics and insights about your data. View trends,
                  patterns, and make data-driven decisions.
                </p>
              </div>
            </Tabs.Content>
            <Tabs.Content value="reports">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Reports</h3>
                <p className="text-[var(--color-text-secondary)]">
                  Generate and download comprehensive reports. Export data in
                  various formats for further analysis.
                </p>
              </div>
            </Tabs.Content>
          </Tabs>
        </Card.Content>
      </Card>

      {/* Example 2: Controlled Tabs */}
      <Card>
        <Card.Header>
          <Card.Title>Controlled Tabs (value + onValueChange)</Card.Title>
          <Card.Description>
            Parent component controls the active tab. Current tab: {controlledTab}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Tabs value={controlledTab} onValueChange={setControlledTab}>
            <Tabs.List>
              <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
              <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
              <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="profile">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Profile Settings</h3>
                <p className="text-[var(--color-text-secondary)]">
                  Manage your profile information, avatar, and bio. Update your
                  personal details and preferences.
                </p>
              </div>
            </Tabs.Content>
            <Tabs.Content value="settings">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Account Settings</h3>
                <p className="text-[var(--color-text-secondary)]">
                  Configure your account settings, privacy options, and security
                  preferences. Manage connected applications.
                </p>
              </div>
            </Tabs.Content>
            <Tabs.Content value="notifications">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Notification Preferences</h3>
                <p className="text-[var(--color-text-secondary)]">
                  Choose which notifications you want to receive. Customize email
                  and push notification settings.
                </p>
              </div>
            </Tabs.Content>
          </Tabs>
        </Card.Content>
      </Card>

      {/* Example 3: Tabs with Disabled State */}
      <Card>
        <Card.Header>
          <Card.Title>Tabs with Disabled State</Card.Title>
          <Card.Description>
            Some tabs can be disabled to prevent interaction
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Tabs defaultValue="active">
            <Tabs.List>
              <Tabs.Trigger value="active">Active</Tabs.Trigger>
              <Tabs.Trigger value="pending" disabled>
                Pending (Disabled)
              </Tabs.Trigger>
              <Tabs.Trigger value="completed">Completed</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="active">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Active Items</h3>
                <p className="text-[var(--color-text-secondary)]">
                  View all currently active items in your workflow.
                </p>
              </div>
            </Tabs.Content>
            <Tabs.Content value="pending">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Pending Items</h3>
                <p className="text-[var(--color-text-secondary)]">
                  This tab is disabled and cannot be accessed.
                </p>
              </div>
            </Tabs.Content>
            <Tabs.Content value="completed">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-2">Completed Items</h3>
                <p className="text-[var(--color-text-secondary)]">
                  Review all completed items and their results.
                </p>
              </div>
            </Tabs.Content>
          </Tabs>
        </Card.Content>
      </Card>

      {/* Keyboard Navigation Instructions */}
      <Card>
        <Card.Header>
          <Card.Title>Keyboard Navigation</Card.Title>
        </Card.Header>
        <Card.Content>
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li><kbd className="px-2 py-1 bg-[var(--color-surface)] rounded">Tab</kbd> - Focus on tab list</li>
            <li><kbd className="px-2 py-1 bg-[var(--color-surface)] rounded">Arrow Left/Up</kbd> - Navigate to previous tab</li>
            <li><kbd className="px-2 py-1 bg-[var(--color-surface)] rounded">Arrow Right/Down</kbd> - Navigate to next tab</li>
            <li><kbd className="px-2 py-1 bg-[var(--color-surface)] rounded">Home</kbd> - Navigate to first tab</li>
            <li><kbd className="px-2 py-1 bg-[var(--color-surface)] rounded">End</kbd> - Navigate to last tab</li>
          </ul>
        </Card.Content>
      </Card>
    </div>
  );
};

export default TabsThemeExample;
