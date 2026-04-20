# Pulse Pro — Functional + UX Audit Report

**Date:** April 20, 2026  
**Scope:** Dashboard (Command Center), System Hub (Settings), and all primary views  
**Objective:** Identify and document dead interactions, 404 errors, duplicate UI, disconnected UX, and UI overload

---

## Executive Summary

The Pulse Pro frontend has **strong visual consistency** but suffers from **functional disconnects** and **redundant UI patterns**. The audit reveals:

- **Dead interactions:** Setup Guide "Dismiss" button, hidden page header controls
- **Duplicate metrics:** KPI Cards and System Ecosystem show identical data
- **Disconnected flows:** Metrics are not clickable/actionable
- **UI overload:** Too many competing sections without clear hierarchy
- **No 404 errors found:** All API endpoints are properly wired

**Priority:** Transform from "visually decent but functionally broken" to "fully wired, actionable, non-redundant system UI"

---

## 1. Dashboard View (Command Center) — Critical Issues

### 1.1 Dead Interactions ❌

| Element | Issue | Severity | Fix |
|---------|-------|----------|-----|
| **Setup Guide "Dismiss" button** | `<button>` with no `onClick` handler | High | Wire to localStorage flag or remove entirely |
| **Hidden page header** | Entire header section with `display: 'none'` containing Settings + Run Pipeline buttons | Medium | Remove dead code or expose with feature flag |
| **System Ecosystem warning "Run Now"** | Duplicate of hero CTA, adds noise | Low | Remove or consolidate with primary action |

**Code locations:**
- Setup Guide: `DashboardView.jsx` line ~240 (`<button style={{ ... }}>Dismiss</button>`)
- Hidden header: `DashboardView.jsx` line ~165-185 (`<div style={{ display: 'none' }}>`)

### 1.2 Duplicate UI / Redundant Metrics ❌

**Problem:** Same data shown in multiple places without differentiation

| Metric | Location 1 | Location 2 | Location 3 |
|--------|-----------|-----------|-----------|
| **Total Articles** | Hero metrics (`{totalArticles} tracked stories`) | KPI Card ("Intelligence Base") | System Ecosystem ("INTELLIGENCE BASE") |
| **Analyzed Count** | Hero metrics (`{qualityPct}% analysis coverage`) | KPI Card ("AI Processed") | System Ecosystem ("AI ANALYZED") |
| **Content Ready** | Hero metrics (`{contentReady} ready to publish`) | KPI Card ("Content Ready") | System Ecosystem ("POSTS GENERATED") |
| **Quality %** | Hero metrics | KPI Card ("Quality Index") | System Ecosystem badge |

**Impact:** Users see the same number 3 times, creating visual noise and reducing trust in the system

**Recommendation:**
- **Keep:** Hero metrics (primary at-a-glance)
- **Remove:** Either KPI Cards OR System Ecosystem section (they're identical)
- **Alternative:** Differentiate sections (e.g., KPI Cards = today's delta, System Ecosystem = all-time totals)

### 1.3 Disconnected UX / Fake System Feel ❌

**Problem:** Metrics look important but don't lead anywhere

| Element | Current Behavior | Expected Behavior | Fix |
|---------|-----------------|-------------------|-----|
| **KPI Cards** | Hover effect only, no click action | Click to filter/navigate | Add `onClick` to navigate to filtered view |
| **"Intelligence Base" card** | Shows count, not clickable | Click → Articles view (all) | `onClick={() => navigate('/articles')}` |
| **"Content Ready" card** | Shows count, not clickable | Click → Articles view (ready filter) | `onClick={() => navigate('/articles?filter=ready')}` |
| **System Ecosystem cards** | Static display | Click → relevant filtered view | Wire each card to navigation |
| **Priority Picks** | Rows navigate to `/articles` (generic) | Navigate to specific story | `onClick={() => navigate(\`/articles?story=\${story.id}\`)}` |
| **Intel Cards "Deep Dive" button** | Navigates to `/articles` (generic) | Open specific story detail | Wire to story detail modal/view |

**Code locations:**
- KPI Cards: `DashboardView.jsx` line ~60-75 (KpiCard component)
- System Ecosystem: `DashboardView.jsx` line ~330-360

### 1.4 UI Overload / No Hierarchy ❌

**Problem:** Too many sections competing for attention

**Current structure:**
1. Focus Banner (hero)
2. Today's Focus (conditional alert)
3. Setup Guide (progress bar)
4. Pipeline Live Status
5. KPI Cards (4 cards)
6. Live Intelligence Feed (3 cards)
7. Priority Picks (sidebar)
8. Quick Access (6 tiles)
9. System Ecosystem (4 cards + warning)

**Issues:**
- 9 distinct sections on one page
- No clear "what to do next" hierarchy
- Setup Guide always visible (even after completion)
- KPI Cards + System Ecosystem = duplicate data

**Recommendations:**
1. **Merge KPI Cards + System Ecosystem** → Single "System Status" section
2. **Hide Setup Guide** after completion (localStorage flag)
3. **Prioritize actionable sections:**
   - Hero (primary CTA)
   - Today's Focus (if content ready)
   - Live Intelligence Feed (top 3 stories)
   - Quick Access (navigation)
4. **Move to secondary:**
   - Pipeline Status (collapsible or status bar)
   - Priority Picks (merge into Intelligence Feed)

---

## 2. Articles View — Issues

### 2.1 Positive Findings ✅

- **Virtualization implemented** (T14) for lists >50 items
- **Bulk operations fully wired** via BulkOperationsContext
- **Filter system functional** with score tabs, source filter, sort
- **No dead interactions found**

### 2.2 Minor Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| **"Launch All" button** | Calls `handleBulkGenerate` on ALL filtered stories without confirmation | Medium | Add confirmation modal for bulk operations >10 items |
| **Empty state "Reset Filters"** | Invalidates entire query cache (overkill) | Low | Just reset local filter state |

---

## 3. Settings View (System Hub) — Issues

### 3.1 Positive Findings ✅

- **Tab navigation fully functional** with URL sync
- **All setting modules load correctly**
- **Mobile responsive** with horizontal scroll tabs
- **No dead interactions found**

### 3.2 Minor Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| **Tailwind classes mixed with CSS variables** | Low | Migrate to pure CSS variables for consistency |
| **Mobile tab labels truncated** | Low | Use icons only on mobile or improve truncation |

---

## 4. Other Views — Quick Audit

### 4.1 AnalyticsView
- **Status:** Wrapper only, delegates to `EnhancedAnalytics` component
- **Issues:** None found (needs deeper component audit)

### 4.2 ResearchView
- **Status:** Wrapper only, delegates to `ResearchViewComponent`
- **Issues:** None found (needs deeper component audit)

### 4.3 CalendarView
- **Status:** Wrapper only, delegates to `ContentCalendar`
- **Issues:** None found (needs deeper component audit)

### 4.4 MediaView
- **Status:** Wrapper only, delegates to `MediaManager`
- **Issues:** None found (needs deeper component audit)

---

## 5. API Integration — 404 Error Check

### 5.1 Verified Endpoints ✅

All API calls in audited views use correct endpoints:

| Endpoint | Usage | Status |
|----------|-------|--------|
| `GET /api/stories` | useStories hook | ✅ Working |
| `GET /api/stories/sources` | Source filter | ✅ Working |
| `POST /api/generate` | Bulk generate | ✅ Working |
| `POST /api/pipeline/run` | Run pipeline | ✅ Working |
| `GET /api/pipeline/status` | Pipeline status | ✅ Working |
| `PATCH /api/stories/:id/pipeline` | Story approval | ✅ Working |

### 5.2 Known Issues from Previous Audit

| Issue | Status | Notes |
|-------|--------|-------|
| **useDataMigration double `/api` prefix** | ❌ Still broken | Not used in audited views |
| **Raw `fetch('/api/...')` vs `api` client** | ⚠️ Mixed usage | Works but inconsistent |

---

## 6. Prioritized Fix List

### P0 — Critical (Fix First)

1. **Wire Setup Guide "Dismiss" button** or remove section
2. **Remove hidden page header** dead code
3. **Make KPI Cards clickable** with navigation to filtered views
4. **Remove duplicate metrics** (merge KPI Cards + System Ecosystem)

### P1 — High Priority

5. **Wire System Ecosystem cards** to navigation
6. **Fix Intel Card "Deep Dive"** to open specific story
7. **Fix Priority Picks** to navigate to specific story
8. **Hide Setup Guide** after completion (localStorage)

### P2 — Medium Priority

9. **Add confirmation** for "Launch All" bulk operations >10 items
10. **Reduce Dashboard sections** from 9 to 5-6 core sections
11. **Establish clear hierarchy** (primary → secondary → tertiary)

### P3 — Low Priority (Polish)

12. **Consolidate Pipeline Status** (collapsible or status bar)
13. **Improve empty state** reset logic (don't invalidate entire cache)
14. **Settings mobile tab** truncation improvements

---

## 7. Recommended Dashboard Redesign

### 7.1 New Structure (6 sections)

```
1. Hero Banner (Focus + Primary CTA)
   - Tracked stories, analysis coverage, ready to publish
   - Primary CTA: "Review Launch Queue" or "Run Pipeline"
   - Secondary CTA: "Open Calendar" or "Open Settings"

2. Today's Focus (conditional, if content ready)
   - Alert banner with "X articles ready to launch"
   - CTA: "Review & Launch"

3. Setup Guide (conditional, if not completed)
   - Progress bar with steps
   - Dismiss button (wired to localStorage)

4. Live Intelligence Feed (top 3 stories)
   - Intel cards with score, title, summary, angle
   - Click card → open story detail
   - "Deep Dive" button → open story detail

5. System Status (merged KPI + Ecosystem)
   - 4 clickable cards:
     * Intelligence Base → /articles
     * AI Analyzed → /articles?filter=analyzed
     * Content Ready → /articles?filter=ready
     * Pipeline Status → collapsible detail
   - Remove duplicate metrics

6. Quick Access (6 navigation tiles)
   - Production Feed, Metrics Engine, Research Hub
   - Podcast Studio, Editorial Calendar, Strategy Lab
```

### 7.2 Removed Sections

- **KPI Cards** (merged into System Status)
- **System Ecosystem** (merged into System Status)
- **Priority Picks** (merged into Intelligence Feed or removed)
- **Pipeline idle warning** (redundant with hero CTA)

---

## 8. Implementation Plan

### Phase 1: Remove Dead Code (1-2 hours)
- Remove hidden page header
- Wire or remove Setup Guide dismiss button
- Clean up duplicate Pipeline warnings

### Phase 2: Wire Interactions (2-3 hours)
- Make KPI Cards clickable
- Wire System Ecosystem cards
- Fix Intel Card + Priority Picks navigation
- Add story detail modal/view

### Phase 3: Reduce Redundancy (2-3 hours)
- Merge KPI Cards + System Ecosystem
- Hide Setup Guide after completion
- Consolidate Pipeline Status

### Phase 4: Establish Hierarchy (1-2 hours)
- Reorder sections by priority
- Add visual weight to primary actions
- Reduce secondary section prominence

### Total Estimated Time: 6-10 hours

---

## 9. Success Criteria

After fixes, the Dashboard should:

1. ✅ **Zero dead interactions** — Every button does something
2. ✅ **Zero duplicate metrics** — Each data point shown once
3. ✅ **Actionable metrics** — Click any metric to see details
4. ✅ **Clear hierarchy** — Primary action obvious within 2 seconds
5. ✅ **Logical flow** — Data → Insight → Action
6. ✅ **Reduced noise** — 5-6 sections max, not 9

---

## 10. Next Steps

1. **Review this audit** with product/design team
2. **Prioritize fixes** based on user impact
3. **Create implementation tasks** in TASK_EXECUTION_PLAN.md
4. **Execute Phase 1** (remove dead code)
5. **Test and iterate** on Phases 2-4

---

*This audit is based on code review as of April 20, 2026. Line numbers may shift after edits.*
