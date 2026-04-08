# Pulse Pro — Frontend Fix Tasks

**Source Report:** `docs/FRONTEND_INVESTIGATION_REPORT.md`  
**Total Tasks:** 12  
**Last Updated:** 2026-03-09

---

## Priority Legend
- 🔴 **HIGH** — Broken functionality / crash risk
- 🟡 **MEDIUM** — Silent data errors or broken UX flows
- 🟢 **LOW** — Logic edge cases / minor inconsistencies

---

## Status Legend
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done

---

## Group A — API Endpoint Mismatches (Critical Path)

These cause buttons and data sections to silently fail or always return empty/error.

---

### TASK-01 🔴 Fix media assets fetch in StoryCard

**File:** `frontend/src/components/StoryCard.jsx`  
**Lines:** 111–114

**Problem:**  
`fetchMedia()` calls `/api/media/${story.id}` and reads `data.media`.  
The correct backend endpoint is `/api/media/assets/${story.id}` and returns `{ images, video_scripts }`.

**Changes needed:**
- [ ] Change fetch URL from `/api/media/${story.id}` → `/api/media/assets/${story.id}`
- [ ] Change `setMedia(data.media || [])` → `setMedia(data.images || [])`
- [ ] Verify `asset.url` field matches what `/api/media/assets` returns inside `images[]`

---

### TASK-02 🔴 Fix AI image generation endpoint in StoryCard

**File:** `frontend/src/components/StoryCard.jsx`  
**Lines:** 124–128

**Problem:**  
`generateAIImage()` POSTs to `/api/generate/image`.  
Backend endpoint is `POST /api/media/generate-image`.

**Changes needed:**
- [ ] Change fetch URL from `/api/generate/image` → `/api/media/generate-image`
- [ ] Verify request body shape: backend expects `{ article_id, prompt }` — the frontend currently only sends `{ article_id }`. A `prompt` field may be required.

---

### TASK-03 🔴 Implement or stub quote card backend endpoint

**Files:** `frontend/src/components/StoryCard.jsx` (line 145) and `backend/main.py`

**Problem:**  
`generateQuoteCard()` POSTs to `/api/generate/quote-card` which does not exist in the backend. The button always 404s.

**Options (choose one):**
- [ ] **Option A:** Add `POST /api/generate/quote-card` to `backend/main.py` (implement the feature)
- [ ] **Option B:** Remove the "Quote Card" button from `StoryCard.jsx` until the backend is implemented
- [ ] **Option C:** Disable the button with a tooltip "Coming soon" to prevent silent failures

---

### TASK-04 🟡 Fix `avg_quality_score` missing from dashboard stats API

**Files:** `backend/main.py` (line 401–407) and `frontend/src/components/DashboardStats.jsx` (line 27)

**Problem:**  
`/api/stats/dashboard` never returns `avg_quality_score`. Frontend always renders `0%`.  
Fallback path hardcodes `87` as a fake value.

**Changes needed:**
- [ ] Add `avg_quality_score` to the `/api/stats/dashboard` backend response — compute it from `ProcessedArticle.viral_score` or `category_score` average
- [ ] Remove the hardcoded `avgQualityScore: processedArticles > 0 ? 87 : 0` from `fetchStatsIndividually()` in `DashboardStats.jsx`

---

## Group B — Render Bugs

These cause incorrect DOM structure, unexpected API calls, or outright crashes.

---

### TASK-05 🔴 Fix broken mobile navigation (Sidebar never opens)

**Files:** `frontend/src/App.jsx` (lines 85, 1042–1048, header JSX) and `frontend/src/components/Sidebar.jsx`

**Problem:**  
`mobileMenuOpen` state exists but is never wired to `<Sidebar>`. The `<Menu>` icon is imported but never rendered. The sidebar is permanently off-screen on mobile (`-translate-x-full`).

**Changes needed:**
- [ ] Add a hamburger `<Menu>` button to the `<header>` in `App.jsx` that calls `setMobileMenuOpen(true)` (button should only render on mobile via Tailwind `lg:hidden`)
- [ ] Pass `isOpen={mobileMenuOpen}` and `onClose={() => setMobileMenuOpen(false)}` to `<Sidebar>`
- [ ] Verify `Sidebar.jsx` correctly applies `translate-x-0` when `isOpen === true`

---

### TASK-06 🟡 Remove duplicate `<ToastContainer>` instance

**File:** `frontend/src/App.jsx` (lines 1275, 1414–1422)

**Problem:**  
Two `<ToastContainer>` components are rendered simultaneously. The one inside `AppContent` at line 1275 has no props and is always empty. The correct instance is `ToastWrapper` in the outer `App`.

**Changes needed:**
- [ ] Remove the `<ToastContainer />` call from inside `AppContent` (line 1275)
- [ ] Keep the `ToastWrapper` in the outer `App` as the single source of truth

---

### TASK-07 🟡 Lazy-mount settings tab components

**File:** `frontend/src/components/SettingsView.jsx` (lines 18–61)

**Problem:**  
All tab components are instantiated in a static array, causing every `useEffect` in every settings module to fire on first render. `SystemHealth` starts a 30-second polling interval even if the tab is never visited.

**Changes needed:**
- [ ] Change the `tabs` array to store component constructors/functions (e.g. `component: MonetizationManager`) rather than rendered elements (`<MonetizationManager />`)
- [ ] Render the active component dynamically: `const ActiveComponent = tabs.find(t => t.id === activeTab)?.component; return <ActiveComponent />;`
- [ ] This ensures each module only mounts when its tab is selected and unmounts when switching away

---

### TASK-08 🟡 Add null guard for `story.source` in StoryCard

**File:** `frontend/src/components/StoryCard.jsx` (line 471)

**Problem:**  
`story.source.charAt(0)` throws `TypeError` if `source` is `null` or `undefined`, crashing the entire card.

**Changes needed:**
- [ ] Change `story.source.charAt(0).toUpperCase()` → `(story.source || '?').charAt(0).toUpperCase()`
- [ ] Also guard `story.source` used on line 474: `{story.source}` → `{story.source || 'Unknown'}`

---

## Group C — Frontend / Backend Sync Issues

These are cases where the frontend and backend are diverged in their data model or ownership of logic.

---

### TASK-09 🟡 Wire `EnhancedAnalytics` to dedicated analytics endpoints

**File:** `frontend/src/components/EnhancedAnalytics.jsx`

**Problem:**  
Component fetches the full story list and aggregates analytics client-side. Backend has richer, pre-computed endpoints (`/api/analytics/summary`, `/api/analytics/dashboard`) that are never used.

**Changes needed:**
- [ ] Replace the `/api/stories?limit=all` fetch with a call to `GET /api/analytics/summary`
- [ ] Replace the `/api/stories?limit=all` fetch with a call to `GET /api/analytics/dashboard` for platform metrics and trending topics
- [ ] Map the new response shapes to the existing chart data structures (`timelineData`, `sourceData`, `scoreData`)
- [ ] Remove the client-side `processTimelineData`, `processSourceData`, `processScoreData` functions if their logic is now handled server-side

---

### TASK-10 🟢 Connect QuickActions "Generate Content" to real handler

**File:** `frontend/src/App.jsx` (line 1067)

**Problem:**  
The "Generate Content" quick-action button shows an `alert('Bulk content generation coming soon!')` placeholder while `handleBulkGenerate` is fully implemented.

**Changes needed:**
- [ ] Replace `onGenerateContent={() => alert('Bulk content generation coming soon!')}` with a meaningful action
- [ ] **Option A:** Wire it to `handleBulkGenerate` with all currently selected IDs (or prompt the user to select first)
- [ ] **Option B:** If intent is to generate for all stories, add a confirmation dialog then call `handleBulkGenerate(stories.map(s => s.id))`

---

## Group D — Minor Logic Issues

---

### TASK-11 🟢 Fix misleading SystemHealth icon for empty services

**File:** `frontend/src/components/SystemHealth.jsx` (line 60)

**Problem:**  
`services.every(s => s.status === 'ok')` returns `true` on empty array, showing the green shield icon when no services have been verified at all.

**Changes needed:**
- [ ] Change condition to: `services.length > 0 && services.every(s => s.status === 'ok')`
- [ ] When `services.length === 0` — render the `AlertCircle` or a neutral icon with text "No pipeline data yet"

---

### TASK-12 🟢 Fix DailyIntelligence inline pipeline trigger

**File:** `frontend/src/components/DailyIntelligence.jsx` (lines 55–63)

**Problem:**  
"Generate Intelligence" button fires its own `fetch('/api/pipeline/run')` inline, bypassing the global `pipelineRunning` state in `App.jsx`. The header "Syncing" indicator doesn't activate, and the `alert()` falsely promises an auto-refresh.

**Changes needed:**
- [ ] Remove the inline `fetch` and `alert` from `DailyIntelligence.jsx`
- [ ] Accept an `onRunPipeline` callback prop from `App.jsx`
- [ ] Wire the button to `props.onRunPipeline()` so it goes through `handleRunPipeline` in `App.jsx`, which already manages `pipelineRunning` state and story refresh

---

## Task Overview

| Task | Priority | Group | File | Status |
|------|----------|-------|------|--------|
| TASK-01 | 🔴 HIGH | API Mismatch | `StoryCard.jsx` | `[ ]` |
| TASK-02 | 🔴 HIGH | API Mismatch | `StoryCard.jsx` | `[ ]` |
| TASK-03 | 🔴 HIGH | API Mismatch | `StoryCard.jsx` + `main.py` | `[ ]` |
| TASK-04 | 🟡 MEDIUM | API Mismatch | `DashboardStats.jsx` + `main.py` | `[ ]` |
| TASK-05 | 🔴 HIGH | Render Bug | `App.jsx` + `Sidebar.jsx` | `[ ]` |
| TASK-06 | 🟡 MEDIUM | Render Bug | `App.jsx` | `[ ]` |
| TASK-07 | 🟡 MEDIUM | Render Bug | `SettingsView.jsx` | `[ ]` |
| TASK-08 | 🟡 MEDIUM | Render Bug | `StoryCard.jsx` | `[ ]` |
| TASK-09 | 🟡 MEDIUM | Sync Issue | `EnhancedAnalytics.jsx` | `[ ]` |
| TASK-10 | 🟢 LOW | Sync Issue | `App.jsx` | `[ ]` |
| TASK-11 | 🟢 LOW | Logic | `SystemHealth.jsx` | `[ ]` |
| TASK-12 | 🟢 LOW | Logic | `DailyIntelligence.jsx` | `[ ]` |

---

*Generated from `docs/FRONTEND_INVESTIGATION_REPORT.md` — static analysis only, no runtime testing performed.*
