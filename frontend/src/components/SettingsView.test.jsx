import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import SettingsView from './SettingsView';

// Mock the setting modules to avoid complex dependencies
vi.mock('./MonetizationManager', () => ({ default: () => <div>Monetization</div> }));
vi.mock('./SystemHealth', () => ({ default: () => <div>System Health</div> }));
vi.mock('./WebhookManager', () => ({ default: () => <div>Webhooks</div> }));
vi.mock('./ExtensionHelp', () => ({ default: () => <div>Extension Help</div> }));
vi.mock('./RSSManager', () => ({ default: () => <div>RSS Manager</div> }));
vi.mock('./StyleProfile', () => ({ default: () => <div>Style Profile</div> }));
vi.mock('./ThemeSelector', () => ({ default: () => <div>Theme Selector</div> }));
vi.mock('./AdvancedTools', () => ({ default: () => <div>Advanced Tools</div> }));
vi.mock('./KeywordsManager', () => ({ default: () => <div>Keywords Manager</div> }));
vi.mock('./LLMProviders', () => ({ default: () => <div>LLM Providers</div> }));

describe('SettingsView Mobile Tab Truncation Fix', () => {
  const renderComponent = (initialTab = 'monetization', activeTheme = 'light') => {
    return render(
      <BrowserRouter>
        <SettingsView initialTab={initialTab} activeTheme={activeTheme} />
      </BrowserRouter>
    );
  };

  it('should render mobile tabs with icons and title attributes', () => {
    const { container } = renderComponent();
    
    // Find the mobile tab container (has lg:hidden class)
    const mobileTabContainer = container.querySelector('.lg\\:hidden.overflow-x-auto');
    expect(mobileTabContainer).toBeInTheDocument();
    
    // Get all buttons within the mobile tab container
    const mobileButtons = mobileTabContainer.querySelectorAll('button');
    expect(mobileButtons.length).toBeGreaterThan(0);
    
    // Check that each button has a title attribute
    mobileButtons.forEach(button => {
      expect(button).toHaveAttribute('title');
      expect(button.getAttribute('title')).toBeTruthy();
    });
  });

  it('should have icon-only display on mobile (labels hidden below md breakpoint)', () => {
    const { container } = renderComponent();
    
    // Find the mobile tab container
    const mobileTabContainer = container.querySelector('.lg\\:hidden.overflow-x-auto');
    const mobileButtons = mobileTabContainer.querySelectorAll('button');
    
    // Check that labels have 'hidden md:inline' class (icon-only on mobile)
    mobileButtons.forEach(button => {
      const labelSpan = button.querySelector('span.hidden.md\\:inline');
      expect(labelSpan).toBeInTheDocument();
    });
  });

  it('should switch tabs when mobile tab is clicked', () => {
    const { container } = renderComponent('monetization');
    
    // Find the mobile tab container and get all buttons
    const mobileTabContainer = container.querySelector('.lg\\:hidden.overflow-x-auto');
    const mobileButtons = Array.from(mobileTabContainer.querySelectorAll('button'));
    
    // Find the RSS tab button (first button - Source Manager)
    const rssButton = mobileButtons[0];
    fireEvent.click(rssButton);
    
    // RSS Manager content should be displayed
    expect(screen.getByText('RSS Manager')).toBeInTheDocument();
  });

  it('should render all tabs with proper accessibility', () => {
    const { container } = renderComponent();
    
    // Expected tab labels
    const expectedTabs = [
      'Source Manager',
      'Style Profile',
      'Keywords',
      'Webhooks',
      'Monetization',
      'Browser Widget',
      'System Health',
      'LLM Providers',
      'Interface',
      'Advanced'
    ];
    
    // Find the mobile tab container
    const mobileTabContainer = container.querySelector('.lg\\:hidden.overflow-x-auto');
    const mobileButtons = Array.from(mobileTabContainer.querySelectorAll('button'));
    
    // Should have all 10 tabs
    expect(mobileButtons.length).toBe(expectedTabs.length);
    
    // Each button should have a title matching one of the expected tabs
    mobileButtons.forEach((button, index) => {
      const title = button.getAttribute('title');
      expect(expectedTabs).toContain(title);
    });
  });
});
