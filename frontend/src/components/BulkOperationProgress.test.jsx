import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BulkOperationProgress from './BulkOperationProgress';

describe('BulkOperationProgress', () => {
  it('should not render when isActive is false', () => {
    const { container } = render(
      <BulkOperationProgress
        operationName="Test Operation"
        current={0}
        total={10}
        isActive={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render loading overlay when isActive is true', () => {
    render(
      <BulkOperationProgress
        operationName="Generating Content"
        current={5}
        total={10}
        isActive={true}
      />
    );
    
    expect(screen.getByText('Generating Content')).toBeInTheDocument();
    expect(screen.getByText('Processing 5 of 10 articles')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show correct percentage for progress', () => {
    render(
      <BulkOperationProgress
        operationName="Deleting Articles"
        current={3}
        total={4}
        isActive={true}
      />
    );
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should display disabled message', () => {
    render(
      <BulkOperationProgress
        operationName="Adding Tags"
        current={1}
        total={5}
        isActive={true}
      />
    );
    
    expect(screen.getByText(/Other actions are disabled while this operation is in progress/i)).toBeInTheDocument();
  });

  it('should handle zero total gracefully', () => {
    render(
      <BulkOperationProgress
        operationName="Test Operation"
        current={0}
        total={0}
        isActive={true}
      />
    );
    
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
