import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BulkConfirmationDialog from './BulkConfirmationDialog';

describe('BulkConfirmationDialog', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(
      <BulkConfirmationDialog
        isOpen={false}
        operationName="Generate Content"
        itemCount={15}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render dialog when isOpen is true', () => {
    render(
      <BulkConfirmationDialog
        isOpen={true}
        operationName="Generate Content"
        itemCount={15}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('Confirm Bulk Operation')).toBeInTheDocument();
    expect(screen.getByText('Generate Content')).toBeInTheDocument();
    expect(screen.getByText('15 items')).toBeInTheDocument();
  });

  it('should call onConfirm when Confirm button is clicked', () => {
    const mockConfirm = vi.fn();
    render(
      <BulkConfirmationDialog
        isOpen={true}
        operationName="Delete Articles"
        itemCount={20}
        onConfirm={mockConfirm}
        onCancel={vi.fn()}
      />
    );
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel button is clicked', () => {
    const mockCancel = vi.fn();
    render(
      <BulkConfirmationDialog
        isOpen={true}
        operationName="Schedule Content"
        itemCount={12}
        onConfirm={vi.fn()}
        onCancel={mockCancel}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when backdrop is clicked', () => {
    const mockCancel = vi.fn();
    const { container } = render(
      <BulkConfirmationDialog
        isOpen={true}
        operationName="Generate Content"
        itemCount={15}
        onConfirm={vi.fn()}
        onCancel={mockCancel}
      />
    );
    
    // Click the backdrop (first div)
    const backdrop = container.firstChild;
    fireEvent.click(backdrop);
    
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('should not call onCancel when dialog content is clicked', () => {
    const mockCancel = vi.fn();
    render(
      <BulkConfirmationDialog
        isOpen={true}
        operationName="Generate Content"
        itemCount={15}
        onConfirm={vi.fn()}
        onCancel={mockCancel}
      />
    );
    
    // Click the dialog content (not the backdrop)
    const dialogContent = screen.getByText('Confirm Bulk Operation').closest('div');
    fireEvent.click(dialogContent);
    
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('should display different operation names correctly', () => {
    const { rerender } = render(
      <BulkConfirmationDialog
        isOpen={true}
        operationName="Generate Content"
        itemCount={15}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('Generate Content')).toBeInTheDocument();
    
    rerender(
      <BulkConfirmationDialog
        isOpen={true}
        operationName="Delete Articles"
        itemCount={25}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('Delete Articles')).toBeInTheDocument();
    expect(screen.getByText('25 items')).toBeInTheDocument();
  });

  it('should be idempotent - confirming twice should call onConfirm twice', () => {
    const mockConfirm = vi.fn();
    render(
      <BulkConfirmationDialog
        isOpen={true}
        operationName="Generate Content"
        itemCount={15}
        onConfirm={mockConfirm}
        onCancel={vi.fn()}
      />
    );
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    
    expect(mockConfirm).toHaveBeenCalledTimes(2);
  });
});
