import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders, generateMockStory, generateMockStories } from '../test/testUtils';

/**
 * Component Tests
 * 
 * Unit tests for React components following best practices:
 * - Test component rendering
 * - Test user interactions
 * - Test accessibility
 * - Test error states
 * - Test loading states
 */

// StoryCard Component Tests
describe('StoryCard', () => {
  const mockStory = generateMockStory();
  
  it('renders story information correctly', () => {
    const StoryCard = require('../components/StoryCard/StoryCardView').default;
    
    renderWithProviders(
      <StoryCard 
        story={mockStory}
        onGenerate={() => {}}
        onPost={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );
    
    expect(screen.getByText(mockStory.title)).toBeInTheDocument();
    expect(screen.getByText(mockStory.content)).toBeInTheDocument();
    expect(screen.getByText(mockStory.score)).toBeInTheDocument();
  });
  
  it('handles generate button click', async () => {
    const onGenerate = vi.fn();
    const StoryCard = require('../components/StoryCard/StoryCardView').default;
    
    renderWithProviders(
      <StoryCard 
        story={mockStory}
        onGenerate={onGenerate}
        onPost={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await userEvent.click(generateButton);
    
    expect(onGenerate).toHaveBeenCalledWith(mockStory.id);
  });
  
  it('shows loading state when generating', () => {
    const StoryCard = require('../components/StoryCard/StoryCardView').default;
    
    renderWithProviders(
      <StoryCard 
        story={mockStory}
        onGenerate={() => {}}
        onPost={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
        isGenerating={true}
      />
    );
    
    expect(screen.getByText(/generating/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
  });
  
  it('is accessible', () => {
    const StoryCard = require('../components/StoryCard/StoryCardView').default;
    
    renderWithProviders(
      <StoryCard 
        story={mockStory}
        onGenerate={() => {}}
        onPost={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
      />
    );
    
    // Check for proper ARIA attributes
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', expect.stringContaining(mockStory.title));
    
    // Check buttons are accessible
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });
});

// FilterBar Component Tests
describe('FilterBar', () => {
  const mockSources = [
    { name: 'TechCrunch', tags: ['tech', 'startup'] },
    { name: 'Hacker News', tags: ['tech', 'programming'] },
  ];
  
  it('renders filter options correctly', () => {
    const FilterBar = require('../components/FilterBar').default;
    
    renderWithProviders(
      <FilterBar 
        sources={mockSources}
        filters={{}}
        onFilterChange={() => {}}
      />
    );
    
    expect(screen.getByPlaceholderText(/search stories/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /source/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
  });
  
  it('handles search input changes', async () => {
    const onFilterChange = vi.fn();
    const FilterBar = require('../components/FilterBar').default;
    
    renderWithProviders(
      <FilterBar 
        sources={mockSources}
        filters={{}}
        onFilterChange={onFilterChange}
      />
    );
    
    const searchInput = screen.getByPlaceholderText(/search stories/i);
    await userEvent.type(searchInput, 'test query');
    
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      search: 'test query'
    }));
  });
  
  it('handles source filter changes', async () => {
    const onFilterChange = vi.fn();
    const FilterBar = require('../components/FilterBar').default;
    
    renderWithProviders(
      <FilterBar 
        sources={mockSources}
        filters={{}}
        onFilterChange={onFilterChange}
      />
    );
    
    const sourceSelect = screen.getByRole('combobox', { name: /source/i });
    await userEvent.selectOptions(sourceSelect, 'TechCrunch');
    
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      source: 'TechCrunch'
    }));
  });
  
  it('shows active filters when applied', () => {
    const FilterBar = require('../components/FilterBar').default;
    
    renderWithProviders(
      <FilterBar 
        sources={mockSources}
        filters={{ search: 'test', source: 'TechCrunch' }}
        onFilterChange={() => {}}
      />
    );
    
    expect(screen.getByText(/active filters/i)).toBeInTheDocument();
    expect(screen.getByText(/test/i)).toBeInTheDocument();
    expect(screen.getByText(/techcrunch/i)).toBeInTheDocument();
  });
  
  it('clears all filters when clear button is clicked', async () => {
    const onFilterChange = vi.fn();
    const FilterBar = require('../components/FilterBar').default;
    
    renderWithProviders(
      <FilterBar 
        sources={mockSources}
        filters={{ search: 'test', source: 'TechCrunch' }}
        onFilterChange={onFilterChange}
      />
    );
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await userEvent.click(clearButton);
    
    expect(onFilterChange).toHaveBeenCalledWith({});
  });
});

// UI Components Tests
describe('Button Component', () => {
  it('renders with correct variant and size', () => {
    const Button = require('../components/ui/Button').default;
    
    renderWithProviders(
      <Button variant="primary" size="lg">
        Test Button
      </Button>
    );
    
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toHaveClass('bg-blue-600', 'text-lg', 'py-3', 'px-6');
  });
  
  it('shows loading state correctly', () => {
    const Button = require('../components/ui/Button').default;
    
    renderWithProviders(
      <Button loading>
        Loading Button
      </Button>
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
  
  it('is accessible with proper ARIA attributes', () => {
    const Button = require('../components/ui/Button').default;
    
    renderWithProviders(
      <Button ariaLabel="Custom button label">
        Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom button label');
  });
});

describe('Input Component', () => {
  it('renders with label and placeholder', () => {
    const Input = require('../components/ui/Input').default;
    
    renderWithProviders(
      <Input 
        label="Test Input"
        placeholder="Enter text"
      />
    );
    
    expect(screen.getByLabelText(/test input/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
  });
  
  it('shows error state correctly', () => {
    const Input = require('../components/ui/Input').default;
    
    renderWithProviders(
      <Input 
        label="Test Input"
        error="This field is required"
      />
    );
    
    expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
    const input = screen.getByLabelText(/test input/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
  
  it('shows helper text when provided', () => {
    const Input = require('../components/ui/Input').default;
    
    renderWithProviders(
      <Input 
        label="Test Input"
        helperText="This is helper text"
      />
    );
    
    expect(screen.getByText(/this is helper text/i)).toBeInTheDocument();
  });
});

describe('Modal Component', () => {
  it('renders when open', () => {
    const Modal = require('../components/ui/Modal').default;
    
    renderWithProviders(
      <Modal open>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByText(/modal content/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  
  it('does not render when closed', () => {
    const Modal = require('../components/ui/Modal').default;
    
    renderWithProviders(
      <Modal open={false}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.queryByText(/modal content/i)).not.toBeInTheDocument();
  });
  
  it('calls onClose when overlay is clicked', async () => {
    const onClose = vi.fn();
    const Modal = require('../components/ui/Modal').default;
    
    renderWithProviders(
      <Modal open onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog').parentElement;
    await userEvent.click(overlay);
    
    expect(onClose).toHaveBeenCalled();
  });
  
  it('traps focus within modal', async () => {
    const Modal = require('../components/ui/Modal').default;
    
    renderWithProviders(
      <Modal open>
        <button>Button 1</button>
        <button>Button 2</button>
      </Modal>
    );
    
    const button1 = screen.getByRole('button', { name: 'Button 1' });
    button1.focus();
    
    // Tab should stay within modal
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Button 2' })).toHaveFocus();
    
    await userEvent.tab();
    expect(button1).toHaveFocus();
  });
});

// Hook Tests
describe('useStories Hook', () => {
  let queryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });
  
  it('fetches stories successfully', async () => {
    const mockStories = generateMockStories(3);
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockStories }),
      })
    );
    
    const { result } = require('../hooks/useStories').useStories();
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockStories);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });
  
  it('handles fetch errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      })
    );
    
    const { result } = require('../hooks/useStories').useStories();
    
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });
  
  it('refetches stories when refetch is called', async () => {
    const mockStories = generateMockStories(2);
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockStories }),
      })
    );
    global.fetch = fetchMock;
    
    const { result } = require('../hooks/useStories').useStories();
    
    await waitFor(() => {
      expect(result.current.data).toEqual(mockStories);
    });
    
    fetchMock.mockClear();
    
    await result.current.refetch();
    
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('useErrorHandler Hook', () => {
  it('handles errors correctly', () => {
    const { result } = require('../hooks/useErrorHandler').useErrorHandler();
    
    const testError = new Error('Test error');
    result.current.handleError(testError, { component: 'TestComponent' });
    
    expect(result.current.error).toEqual(testError);
  });
  
  it('clears errors when clearError is called', () => {
    const { result } = require('../hooks/useErrorHandler').useErrorHandler();
    
    const testError = new Error('Test error');
    result.current.handleError(testError);
    
    result.current.clearError();
    
    expect(result.current.error).toBeNull();
  });
  
  it('categorizes errors correctly', () => {
    const { result } = require('../hooks/useErrorHandler').useErrorHandler();
    
    const networkError = new Error('Network error');
    result.current.handleError(networkError);
    
    expect(result.current.error.category).toBe('network');
  });
});

// Integration Tests
describe('Story Management Integration', () => {
  let queryClient;
  let mockFetch;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });
  
  it('creates and displays a new story', async () => {
    const mockStory = generateMockStory();
    
    // Mock API responses
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockStory] }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockStory }),
        })
      );
    
    // Render the stories page
    const StoriesPage = require('../pages/StoriesPage').default;
    renderWithProviders(<StoriesPage />, { queryClient });
    
    // Wait for stories to load
    await waitFor(() => {
      expect(screen.getByText(mockStory.title)).toBeInTheDocument();
    });
    
    // Create new story
    const createButton = screen.getByRole('button', { name: /create story/i });
    await userEvent.click(createButton);
    
    // Fill in story form
    const titleInput = screen.getByLabelText(/title/i);
    const contentInput = screen.getByLabelText(/content/i);
    
    await userEvent.type(titleInput, 'New Story Title');
    await userEvent.type(contentInput, 'New story content');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await userEvent.click(submitButton);
    
    // Verify new story is displayed
    await waitFor(() => {
      expect(screen.getByText('New Story Title')).toBeInTheDocument();
    });
  });
  
  it('handles story deletion with confirmation', async () => {
    const mockStory = generateMockStory();
    
    mockFetch
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [mockStory] }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );
    
    const StoriesPage = require('../pages/StoriesPage').default;
    renderWithProviders(<StoriesPage />, { queryClient });
    
    await waitFor(() => {
      expect(screen.getByText(mockStory.title)).toBeInTheDocument();
    });
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await userEvent.click(confirmButton);
    
    // Verify story is removed
    await waitFor(() => {
      expect(screen.queryByText(mockStory.title)).not.toBeInTheDocument();
    });
  });
});

export default {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
};
