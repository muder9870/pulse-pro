# 🔧 CRITICAL FIXES IMPLEMENTATION TASKS

## Task 1: Fix Redis Connection Inconsistency
**File:** `backend/tasks.py`  
**Line:** 220  
**Issue:** `dedupe_message()` uses localhost instead of redis service

## Task 2: Fix acks_late Race Condition  
**File:** `backend/tasks.py`
**Line:** 11
**Issue:** acks_late=True creates race window for duplicate processing

## Task 3: Add Transaction Boundaries
**File:** `backend/tasks.py`
**Function:** `process_article()`
**Issue:** No explicit transaction management for partial failures

## Task 4: Implement Cost Limiting
**File:** `backend/metrics.py`
**Class:** `PipelineMetrics`
**Issue:** No cost controls for retry storms

---

# IMPLEMENTATION PLAN
1. Fix Redis host in dedupe_message()
2. Remove acks_late or implement proper idempotency
3. Add explicit transaction boundaries
4. Implement cost tracking and limits
5. Validate all fixes with chaos tests
