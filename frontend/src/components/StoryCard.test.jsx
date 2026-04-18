import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mock heavy sub-components so StoryCard can render in isolation
// ---------------------------------------------------------------------------
vi.mock('./Story/StoryHeader', () => ({ default: () => <div data-testid="story-header" /> }));
vi.mock('./Story/StoryMetrics', () => ({ default: () => <div data-testid="story-metrics" /> }));
vi.mock('./Story/ContentEditor', () => ({ default: () => <div data-testid="content-editor" /> }));
vi.mock('./Story/PublishPanel', () => ({ default: () => <div data-testid="publish-panel" /> }));
vi.mock('./Story/MediaPanel', () => ({ default: () => <div data-testid="media-panel" /> }));
vi.mock('./Story/StoryModals', () => ({
  QualityModal: () => null,
  TagsModal: () => null,
  EditModal: () => null,
}));
vi.mock('./BlogPublisher', () => ({ default: () => null }));
vi.mock('./ui/Button', () => ({
  default: ({ children, onClick, disabled, icon: Icon, ...rest }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}));
vi.mock('./ui/Checkbox', () => ({
  default: ({ checked, onChange }) => (
    <input type="checkbox" checked={checked} onChange={onChange} />
  ),
}));

import StoryCard from './StoryCard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeStory = (overrides = {}) => ({
  id: 42,
  title: 'Test Article',
  source: 'arxiv',
  category: 'AI',
  tags: [],
  hashtags: [],
  platforms: [],
  posts: [],
  fetched_at: new Date().toISOString(),
  ...overrides,
});

const renderCard = (storyOverrides = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StoryCard story={makeStory(storyOverrides)} />
    </QueryClientProvider>
  );
};

const ALL_PLATFORMS = ['Twitter', 'LinkedIn', 'Blog', 'Instagram', 'Facebook', 'Reddit', 'YouTube', 'Threads'];

// ---------------------------------------------------------------------------
// Tests — Platform pills always visible
// ---------------------------------------------------------------------------

describe('StoryCard — Platform pills always visible', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders all 8 platform pills on the card', () => {
    renderCard({ posts: [] });
    for (const label of ALL_PLATFORMS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders platform pills even when story has no posts', () => {
    renderCard({ posts: undefined });
    expect(screen.getByText('Twitter')).toBeInTheDocument();
  });

  it('does NOT render a standalone "Generate" button', () => {
    renderCard({ posts: [] });
    // Primary CTA is pipeline-based (e.g. Generate Content), not a bare "Generate" button
    expect(screen.queryByRole('button', { name: /^generate$/i })).not.toBeInTheDocument();
  });

  it('does NOT render a platform-selector dropdown or checkboxes', () => {
    renderCard({ posts: [] });
    // No "Select All" / "Deselect All" toggle — that belonged to the old dropdown
    expect(screen.queryByText('Select All')).not.toBeInTheDocument();
    expect(screen.queryByText('Deselect All')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — Idle pill click triggers single-platform generation
// ---------------------------------------------------------------------------

describe('StoryCard — Idle platform pill: click triggers generate', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('calls POST /api/generate with article_id and only the clicked platform', async () => {
    // First call: generate; second call: fetch content
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })                          // POST /api/generate
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'Tweet text' }) }); // GET /api/content/42/twitter

    renderCard({ posts: [] });
    await userEvent.click(screen.getByTitle('Generate Twitter post'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ article_id: 42, platforms: ['twitter'] }),
        })
      );
    });
  });

  it('clicking LinkedIn pill calls generate with platforms: ["linkedin"]', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'LI post' }) });

    renderCard({ posts: [] });
    await userEvent.click(screen.getByTitle('Generate LinkedIn post'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          body: JSON.stringify({ article_id: 42, platforms: ['linkedin'] }),
        })
      );
    });
  });

  it('shows a spinner on the clicked pill while generating', async () => {
    // Never resolves during the test so the loading state stays visible
    global.fetch.mockReturnValue(new Promise(() => {}));

    renderCard({ posts: [] });
    await userEvent.click(screen.getByTitle('Generate Twitter post'));

    // The spinner replaces the idle pill — title attribute disappears
    await waitFor(() => {
      expect(screen.queryByTitle('Generate Twitter post')).not.toBeInTheDocument();
    });
  });

  it('auto-expands the card on successful generation', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'Tweet!' }) })
      .mockResolvedValue({ ok: true, json: async () => ({}) }); // hashtags + media + audio

    renderCard({ posts: [] });
    await userEvent.click(screen.getByTitle('Generate Twitter post'));

    await waitFor(() => {
      expect(screen.getByTestId('publish-panel')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Error state and retry
// ---------------------------------------------------------------------------

describe('StoryCard — Platform pill error & retry', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('shows a retry pill on API failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'LLM unavailable' }),
    });

    renderCard({ posts: [] });
    await userEvent.click(screen.getByTitle('Generate Twitter post'));

    await waitFor(() => {
      // Retry pill has tooltip containing the error message
      expect(screen.getByTitle(/Retry — LLM unavailable/i)).toBeInTheDocument();
    });
  });

  it('retries generation when retry pill is clicked', async () => {
    // First call fails
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'timeout' }),
    });
    // Retry call succeeds
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'Retried!' }) })
      .mockResolvedValue({ ok: true, json: async () => ({}) });

    renderCard({ posts: [] });
    await userEvent.click(screen.getByTitle('Generate Twitter post'));

    await waitFor(() => screen.getByTitle(/Retry — timeout/i));
    await userEvent.click(screen.getByTitle(/Retry — timeout/i));

    await waitFor(() => {
      // After successful retry the retry pill should disappear
      expect(screen.queryByTitle(/Retry —/i)).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Done pill: view content
// ---------------------------------------------------------------------------

describe('StoryCard — Done platform pill: click expands card', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('renders done pills (with checkmark) for platforms that already have posts', () => {
    renderCard({ posts: [{ platform: 'twitter', content: 'existing tweet' }] });
    // Done pill has a "View Twitter content" title
    expect(screen.getByTitle('View Twitter content')).toBeInTheDocument();
  });

  it('clicking a done pill expands the card to show content', async () => {
    renderCard({ posts: [{ platform: 'twitter', content: 'existing tweet' }] });

    expect(screen.queryByTestId('publish-panel')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTitle('View Twitter content'));

    await waitFor(() => {
      expect(screen.getByTestId('publish-panel')).toBeInTheDocument();
    });
  });
});
