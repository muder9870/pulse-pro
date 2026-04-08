-- Migration: Add index for idempotency performance
-- Created: 2026-03-29
-- Purpose: Improve query performance for idempotency checks

CREATE INDEX CONCURRENTLY idx_idempotency_created_at 
ON idempotency_logs(created_at);

-- Add comment for documentation
COMMENT ON INDEX idx_idempotency_created_at IS 'Index for idempotency log queries by creation time';

-- This index improves performance for:
-- - Finding old idempotency entries for cleanup
-- - Checking recent idempotency operations
-- - Performance monitoring and analytics
