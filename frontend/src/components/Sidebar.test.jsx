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
  Image: () => <span data-testid="icon-image">🖼️</span>,
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
  Search: () => <span data-testid="icon-search">🔍</span>,
  Bell: () => <span data-testid="icon-bell">🔔</span>,
}));

describe('Sidebar', () => {
  const defaultProps = {
    currentView: 'dashboard',
    activeSource: null,
    sources: [
      { name: 'arxiv', count: 42 },
      { name: 'github', count: 15 },
    ],
    setActiveSource: vi.fn(),
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
    // Source names are rendered as-is (CSS capitalize handles display)
    expect(screen.getByText('arxiv')).toBeInTheDocument();
    expect(screen.getByText('github')).toBeInTheDocument();
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

  it('expands/collapses source folders section', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('arxiv')).toBeInTheDocument();
    const toggle = screen.getByText('Source Folders');
    fireEvent.click(toggle);
    expect(screen.queryByText('arxiv')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByText('arxiv')).toBeInTheDocument();
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
      <MemoryRouter initialEntries={['/analytics']}>
        <Sidebar {...defaultProps} />
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

  it('renders sidebar as aside landmark', () => {
    render(
      <MemoryRouter>
        <Sidebar {...defaultProps} />
      </MemoryRouter>
    );

    expect(document.querySelector('aside')).toBeTruthy();
  });
});
