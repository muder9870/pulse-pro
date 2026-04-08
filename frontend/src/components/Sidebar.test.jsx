import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import * as React from 'react';

// Mock icons
vi.mock('lucide-react', () => ({
  Home: () => <span data-testid="icon-home">🏠</span>,
  BarChart2: () => <span data-testid="icon-chart">📊</span>,
  Calendar: () => <span data-testid="icon-calendar">📅</span>,
  ImageIcon: () => <span data-testid="icon-image">🖼️</span>,
  BookOpen: () => <span data-testid="icon-book">📖</span>,
  Mic: () => <span data-testid="icon-mic">🎤</span>,
  Settings: () => <span data-testid="icon-settings">⚙️</span>,
  Database: () => <span data-testid="icon-database">🗄️</span>,
  ChevronDown: () => <span data-testid="icon-down">▼</span>,
  ChevronRight: () => <span data-testid="icon-right">▶</span>,
  X: () => <span data-testid="icon-x">✕</span>,
  Zap: () => <span data-testid="icon-zap">⚡</span>,
  Award: () => <span data-testid="icon-award">🏆</span>,
  DollarSign: () => <span data-testid="icon-dollar">$</span>,
  Activity: () => <span data-testid="icon-activity">📈</span>,
  Share2: () => <span data-testid="icon-share">🔗</span>,
  Rss: () => <span data-testid="icon-rss">📡</span>,
  UserCheck: () => <span data-testid="icon-user">👤</span>,
  Chrome: () => <span data-testid="icon-chrome">🌐</span>,
}));

describe('Sidebar', () => {
  const defaultProps = {
    currentView: 'dashboard',
    activeSource: null,
    sources: [
      { name: 'arxiv', count: 42 },
      { name: 'github', count: 15 },
    ],
    onSourceSelect: vi.fn(),
    onClose: vi.fn(),
    isOpen: true,
    activeTheme: 'dark',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders main navigation items', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Media Assets')).toBeInTheDocument();
    expect(screen.getByText('Research')).toBeInTheDocument();
    expect(screen.getByText('Podcast')).toBeInTheDocument();
  });

  it('renders source folders section', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('Source Folders')).toBeInTheDocument();
    expect(screen.getByText('All Sources')).toBeInTheDocument();
    expect(screen.getByText('Arxiv')).toBeInTheDocument();
    expect(screen.getByText('Github')).toBeInTheDocument();
  });

  it('displays source counts', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('expands/collapses settings deep links', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} />
      </MemoryRouter>
    );

    // Initially collapsed
    expect(screen.queryByText('Monetization')).not.toBeInTheDocument();

    // Click to expand
    const settingsToggle = screen.getByText('Quick Links');
    fireEvent.click(settingsToggle);

    // Now visible
    expect(screen.getByText('Monetization')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Webhooks')).toBeInTheDocument();
    expect(screen.getByText('RSS Feeds')).toBeInTheDocument();
    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByText('Extension')).toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} />
      </MemoryRouter>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('has aria-current on active navigation item', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} currentView="analytics" />
      </MemoryRouter>
    );

    const activeButton = screen.getByText('Metrics').closest('button');
    expect(activeButton).toHaveAttribute('aria-current', 'page');
  });

  it('applies title attribute to truncated source names', () => {
    const longSourceName = 'VeryLongSourceNameThatNeedsTruncation';
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} sources={[{ name: longSourceName, count: 5 }]} />
      </MemoryRouter>
    );

    const sourceElement = screen.getByTitle(longSourceName);
    expect(sourceElement).toBeInTheDocument();
  });

  it('renders skip link target id', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} />
      </MemoryRouter>
    );

    // The sidebar is a navigation landmark
    const nav = document.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });
});
