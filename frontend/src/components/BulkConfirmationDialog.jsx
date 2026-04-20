import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * BulkConfirmationDialog - Confirmation dialog for bulk operations affecting >10 items
 * 
 * Requirements: 1.1, 1.5
 * - Displays when bulk operation affects more than 10 items
 * - Shows operation name and item count
 * - Requires explicit confirmation
 * - Cancellable without side effects
 * - Idempotent (confirming twice = same result)
 */
const BulkConfirmationDialog = ({ isOpen, operationName, itemCount, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--amber-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle style={{ width: 20, height: 20, color: 'var(--amber)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 4,
              }}
            >
              Confirm Bulk Operation
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
              You are about to perform a bulk operation on a large number of items.
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
            Operation Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Operation:</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                {operationName}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Items affected:</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}
              >
                {itemCount} items
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkConfirmationDialog;
