import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BulkOperationError from './BulkOperationError';

describe('BulkOperationError', () => {
  const mockFailedArticles = [
    { id: 1, title: 'Article 1', error: 'Network timeout' },
    { id: 2, title: 'Article 2', error: 'Invalid data format' },
    { id: 3, error: 'Server error 500' }
  ];

  it('should not render when isVisible is false', () => {
    const { container } = render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={mockFailedArticles}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
        isVisible={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should not render when failedArticles is empty', () => {
    const { container } = render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={[]}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
        isVisible={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render error header with operation name (Requirement 10.3)', () => {
    render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={mockFailedArticles}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
        isVisible={true}
      />
    );
    
    expect(screen.getByText('Generating Content Failed')).toBeInTheDocument();
    expect(screen.getByText('3 articles could not be processed')).toBeInTheDocument();
  });

  it('should list all failed articles with error messages (Requirement 10.4)', () => {
    render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={mockFailedArticles}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
        isVisible={true}
      />
    );
    
    // Check that all article IDs are displayed
    expect(screen.getByText('Article ID: 1')).toBeInTheDocument();
    expect(screen.getByText('Article ID: 2')).toBeInTheDocument();
    expect(screen.getByText('Article ID: 3')).toBeInTheDocument();
    
    // Check that error messages are displayed (Requirement 10.3, 10.4)
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
    expect(screen.getByText('Invalid data format')).toBeInTheDocument();
    expect(screen.getByText('Server error 500')).toBeInTheDocument();
  });

  it('should display article titles when available', () => {
    render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={mockFailedArticles}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
        isVisible={true}
      />
    );
    
    expect(screen.getByText('Article 1')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked (Requirement 10.5)', () => {
    const onDismiss = vi.fn();
    render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={mockFailedArticles}
        onRetry={vi.fn()}
        onDismiss={onDismiss}
        isVisible={true}
      />
    );
    
    const dismissButtons = screen.getAllByText('Dismiss');
    fireEvent.click(dismissButtons[0]);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry when retry button is clicked (Requirement 10.5)', () => {
    const onRetry = vi.fn();
    render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={mockFailedArticles}
        onRetry={onRetry}
        onDismiss={vi.fn()}
        isVisible={true}
      />
    );
    
    const retryButton = screen.getByText('Retry Failed');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should not render retry button when onRetry is not provided', () => {
    render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={mockFailedArticles}
        onRetry={null}
        onDismiss={vi.fn()}
        isVisible={true}
      />
    );
    
    expect(screen.queryByText('Retry Failed')).not.toBeInTheDocument();
  });

  it('should handle single failed article correctly', () => {
    const singleFailedArticle = [
      { id: 1, title: 'Single Article', error: 'Test error' }
    ];
    
    render(
      <BulkOperationError
        operationName="Tagging"
        failedArticles={singleFailedArticle}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
        isVisible={true}
      />
    );
    
    expect(screen.getByText('1 article could not be processed')).toBeInTheDocument();
  });

  it('should display default error message when error is not provided', () => {
    const articlesWithoutError = [
      { id: 1, title: 'Article without error' }
    ];
    
    render(
      <BulkOperationError
        operationName="Generating Content"
        failedArticles={articlesWithoutError}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
        isVisible={true}
      />
    );
    
    expect(screen.getByText('Unknown error occurred')).toBeInTheDocument();
  });
});
