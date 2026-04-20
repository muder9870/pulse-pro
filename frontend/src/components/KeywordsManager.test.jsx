import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeywordsManager from './KeywordsManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeKeyword = (id, keyword, category = 'Foundation Models') => ({
  id,
  keyword,
  category,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
});

const mockKeywords = [
  makeKeyword(1, 'transformer', 'Foundation Models'),
  makeKeyword(2, 'llm', 'Foundation Models'),
  makeKeyword(3, 'diffusion model', 'Generative AI'),
];

function mockFetch(responses) {
  let callIndex = 0;
  global.fetch = vi.fn(async (url, opts) => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return {
      ok: resp.ok ?? true,
      status: resp.status ?? 200,
      json: async () => resp.body,
    };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KeywordsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('renders keyword list grouped by category on mount', async () => {
    mockFetch([{ body: mockKeywords }]);
    render(<KeywordsManager />);

    await waitFor(() => {
      expect(screen.getByText('transformer')).toBeInTheDocument();
      expect(screen.getByText('llm')).toBeInTheDocument();
      expect(screen.getByText('diffusion model')).toBeInTheDocument();
    });

    // Category headers (rendered as mixed case, not uppercase)
    expect(screen.getByText('Foundation Models')).toBeInTheDocument();
    expect(screen.getByText('Generative AI')).toBeInTheDocument();
  });

  it('shows total keyword count in header', async () => {
    mockFetch([{ body: mockKeywords }]);
    render(<KeywordsManager />);

    await waitFor(() => {
      expect(screen.getByText(/3 keywords/i)).toBeInTheDocument();
    });
  });

  it('add flow: input + submit → API called → list refreshed → input cleared', async () => {
    const newKw = makeKeyword(4, 'rag', 'Agents & Reasoning');
    mockFetch([
      { body: mockKeywords },           // initial GET
      { status: 201, body: newKw },     // POST
      { body: [...mockKeywords, newKw] }, // refresh GET
    ]);

    render(<KeywordsManager />);
    await waitFor(() => screen.getByText('transformer'));

    const input = screen.getByPlaceholderText(/e\.g\. transformer/i);
    await userEvent.type(input, 'rag');
    await userEvent.click(screen.getByRole('button', { name: /add keyword/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/keywords', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"keyword":"rag"'),
      }));
    });

    // Input should be cleared (re-query after re-render)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. transformer/i).value).toBe('');
    });

    // New keyword appears in list
    await waitFor(() => {
      expect(screen.getByText('rag')).toBeInTheDocument();
    });
  });

  it('shows "Keyword already exists" on 409 response', async () => {
    mockFetch([
      { body: mockKeywords },
      { ok: false, status: 409, body: { error: 'Keyword already exists' } },
    ]);

    render(<KeywordsManager />);
    await waitFor(() => screen.getByText('transformer'));

    const input = screen.getByPlaceholderText(/e\.g\. transformer/i);
    await userEvent.type(input, 'transformer');
    await userEvent.click(screen.getByRole('button', { name: /add keyword/i }));

    await waitFor(() => {
      expect(screen.getByText('Keyword already exists')).toBeInTheDocument();
    });
  });

  it('delete flow: click × → confirm → API called → list refreshed', async () => {
    const remaining = [makeKeyword(2, 'llm', 'Foundation Models'), makeKeyword(3, 'diffusion model', 'Generative AI')];
    mockFetch([
      { body: mockKeywords },
      { ok: true, status: 204, body: null },
      { body: remaining },
    ]);

    render(<KeywordsManager />);
    await waitFor(() => screen.getByText('transformer'));

    // Click the × button for 'transformer' (id=1)
    const deleteButtons = screen.getAllByTitle('Delete keyword');
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/keywords/1', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    await waitFor(() => {
      expect(screen.queryByText('transformer')).not.toBeInTheDocument();
    });
  });

  it('Reset to Defaults calls POST /api/keywords/bulk', async () => {
    mockFetch([
      { body: mockKeywords },
      { body: { created: 80, skipped: 4 } },
      { body: mockKeywords },
    ]);

    render(<KeywordsManager />);
    await waitFor(() => screen.getByText('transformer'));

    await userEvent.click(screen.getByText('Reset to Defaults'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/keywords/bulk', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  it('shows retry button when API is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<KeywordsManager />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
