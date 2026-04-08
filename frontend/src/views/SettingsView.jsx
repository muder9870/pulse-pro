import React from 'react';
import SettingsViewComponent from '../components/SettingsView';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';

/**
 * SettingsView — wraps the SettingsView component with an error boundary.
 *
 * @param {string} activeTheme - current theme ('light' | 'dark')
 * @param {string} initialTab  - which settings tab to open by default
 */
const SettingsView = ({ activeTheme, initialTab }) => (
  <FeatureErrorBoundary name="Settings">
    <SettingsViewComponent activeTheme={activeTheme} initialTab={initialTab} />
  </FeatureErrorBoundary>
);

export default SettingsView;
