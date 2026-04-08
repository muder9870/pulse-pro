# Pulse Pro — Frontend Investigation Report

**Date:** 2026-03-09  
**Scope:** `frontend/src/` vs `backend/main.py` & `backend/scheduler.py`  
**Status:** No code changes made — report only

---

## Executive Summary

The frontend is broadly functional but contains **three confirmed API endpoint mismatches** (two wrong paths, one missing entirely), **one incorrect response field assumption** that silently produces `0` forever, **two render-layer bugs** (duplicate toast rendering and all-tabs-mounted-at-once), and **one completely broken mobile navigation flow**. These compound to create silent data display errors and broken UI flows on certain screen sizes and feature paths.

---

## 1. Render Issues

### 1.1 Duplicate `<ToastContainer>` Rendering

**Files:** `src/App.jsx` (lines 1275, 1414–1422)

Two separate `<ToastContainer>` instances are mounted simultaneously:

- **Instance 1** — Inside `AppContent` at line 1275:  
  `<ToastContainer />` — rendered **without props** (no `toasts`, no `removeToast`)
- **Instance 2** — In the outer `App` component, a `ToastWrapper` that correctly reads context and passes props to `<ToastContainer toasts={toasts} removeToast={removeToast} />`

The first instance will always render an empty container (no props), and the second will render the real toasts. This means:
- Two DOM containers exist on every page load
- The inner `<ToastContainer />` in `AppContent` is always empty and dead
- Any CSS that targets the toast container (z-index stacking, positioning) could conflict

**Fix direction:** Remove the `<ToastContainer />` call from inside `AppContent` — the `ToastWrapper` in `App` is the correct, prop-connected instance.

---

### 1.2 All Settings Tabs Instantiated on First Mount

**File:** `src/components/SettingsView.jsx` (lines 18–61)

All setting module components are instantiated inline when `SettingsView` first renders:

```js
const tabs = [
  { id: 'monetization', component: <MonetizationManager /> },
  { id: 'health',       component: <SystemHealth /> },    // ← always mounted
  { id: 'webhooks',     component: <WebhookManager /> },  // ← always mounted
  { id: 'rss',          component: <RSSManager /> },      // ← always mounted
  ...
];
```

React elements in an array like this are **eagerly created**, meaning all `useEffect` hooks in all those components fire the moment `SettingsView` mounts — regardless of which tab is active. Specifically:

- `SystemHealth` fetches `/api/system/health` and schedules a `setInterval` polling every 30 seconds — **even when the user never visits the Health tab**
- `RSSManager` fetches `/api/rss/feeds` on mount
- `WebhookManager` and `MonetizationManager` also fire their effects immediately

**Fix direction:** Use lazy rendering — only render `activeContent` based on `activeTab` (the value is already computed at line 63), not a pre-instantiated array. Each component should only mount when its tab is selected.

---

### 1.3 Mobile Navigation Is Disconnected

**Files:** `src/App.jsx` (line 85, 1042–1048) and `src/components/Sidebar.jsx`

`App.jsx` declares `const [mobileMenuOpen, setMobileMenuOpen] = useState(false)` but **never passes it to `Sidebar`**:

```jsx
<Sidebar
  currentView={currentView}
  setCurrentView={setCurrentView}
  activeSource={activeSource}
  setActiveSource={setActiveSource}
  sources={uniqueSources}
  // isOpen and onClose are NOT passed
/>
```

`Sidebar.jsx` conditionally uses `isOpen` for the mobile overlay and `translate-x` class, but `isOpen` will always be `undefined` (falsy). The sidebar is permanently hidden on mobile.

Additionally, the `<Menu>` icon is imported in `App.jsx` (line 40) but never rendered anywhere in the JSX — there is no hamburger button in the header to open the mobile sidebar.

**Fix direction:** Pass `isOpen={mobileMenuOpen}` and `onClose={() => setMobileMenuOpen(false)}` to `<Sidebar>`, and add a `<Menu>` button in the header that calls `setMobileMenuOpen(true)`.

---

### 1.4 Potential `TypeError` on `story.source` in StoryCard

**File:** `src/components/StoryCard.jsx` (line 471)

```jsx
<div className="...">
  {story.source.charAt(0).toUpperCase()}
</div>
```

If `story.source` is `null` or `undefined` (which can happen with extension-captured articles or incomplete data), this crashes with a `TypeError: Cannot read properties of null` and the entire story card fails to render. Other fields like `story.url` (line 487) and `story.title` (line 493) are accessed safely or used in JSX interpolation that gracefully handles nulls, but `story.source` is not guarded.

**Fix direction:** Use `(story.source || '?').charAt(0).toUpperCase()`.

---

## 2. API Endpoint Mismatches

### 2.1 Media Assets — Wrong Endpoint Path and Response Shape

**File:** `src/components/StoryCard.jsx` (line 111)

**Frontend calls:**
```js
const res = await fetch(`/api/media/${story.id}`);
const data = await res.json();
setMedia(data.media || []);  // expects { media: [...] }
```

**Backend provides:**
```
GET /api/media/assets/<int:article_id>
→ { "images": [...], "video_scripts": [...] }
```

There is also a route `GET /media/<path:filename>` which serves static files — the frontend path collides with the static file server's path prefix. The correct endpoint is `/api/media/assets/${story.id}` and the response key is `images`, not `media`. As a result, the Visual Assets section of every expanded story card will always show "No visual assets generated yet" even when images exist.

---

### 2.2 AI Image Generation — Wrong Endpoint Path

**File:** `src/components/StoryCard.jsx` (line 124)

**Frontend calls:**
```js
const res = await fetch('/api/generate/image', { method: 'POST', ... });
```

**Backend provides:**
```
POST /api/media/generate-image
```

The path `/api/generate/image` does not exist in the backend. The request will return a 404 and the `Generate AI Image` button will always fail silently with the fallback `alert("Image generation failed")`.

---

### 2.3 Quote Card Generation — Endpoint Does Not Exist

**File:** `src/components/StoryCard.jsx` (line 145)

**Frontend calls:**
```js
const res = await fetch('/api/generate/quote-card', { method: 'POST', ... });
```

**Backend:** No such endpoint exists anywhere in `main.py`. This feature is completely non-functional — the `Quote Card` button will always 404.

---

### 2.4 Dashboard Stats — `avg_quality_score` Field Never Returned

**File:** `src/components/DashboardStats.jsx` (line 27)

**Frontend expects:**
```js
avgQualityScore: data.avg_quality_score || 0
```

**Backend `/api/stats/dashboard` returns:**
```json
{
  "total_articles": ...,
  "processed_articles": ...,
  "generated_content": ...,
  "sources": {...},
  "platforms": {...}
}
```

The field `avg_quality_score` is never included in the response. The frontend will always fall through to `|| 0`, so the "Quality Index" stat card perpetually shows `0%`. The fallback `fetchStatsIndividually()` hardcodes `avgQualityScore: processedArticles > 0 ? 87 : 0` — an invented value that will display as real data.

---

## 3. Frontend–Backend Sync Issues

### 3.1 Analytics Dashboard Ignores Dedicated Backend Endpoints

**File:** `src/components/EnhancedAnalytics.jsx`

The component fetches only `/api/stories?limit=all` and recomputes all analytics client-side:

```js
const fetchAnalyticsData = async () => {
  const res = await fetch('/api/stories?limit=all');
  const stories = await res.json();
  // ... manual aggregation ...
};
```

The backend provides two purpose-built analytics endpoints that are never called by this component:
- `GET /api/analytics/summary` — full aggregated analytics, category/sentiment breakdowns, ROI, topic trends
- `GET /api/analytics/dashboard` — platform performance metrics, daily report, trending topics

This means:
- The analytics view transfers the entire stories array over the network instead of pre-aggregated summaries
- Richer data (sentiment, ROI, topic trends) available from the backend is never displayed
- The backend analytics engine's computed data is silently discarded

---

### 3.2 Bulk Generate in QuickActions Is Placeholder Only

**File:** `src/App.jsx` (line 1067)

```jsx
<QuickActions
  onGenerateContent={() => alert('Bulk content generation coming soon!')}
  ...
/>
```

The "Generate Content" button in the global header quick actions triggers an `alert()` placeholder. This is inconsistent with `handleBulkGenerate` which is fully implemented and wired to the `BulkActionsBar`. The QuickActions button will never do anything useful.

---

### 3.3 Schedule API Response Shape — GET vs Frontend Expectation

**File:** `src/App.jsx` (lines 193–199 for GET, lines 219–223 for POST)

The GET `/api/schedule` returns `scheduler_manager.get_info()`:
```json
{
  "schedule":      { "enabled": ..., "time": ..., "days": [...] },
  "next_run_time": "...",
  "server_time":   "..."
}
```

The frontend reads:
```js
const sched = data.schedule || {};           // ✓ matches
setScheduleEnabled(Boolean(sched.enabled));  // ✓
setScheduleTime(sched.time || '11:00');      // ✓
setScheduleDays(...sched.days...);           // ✓
setScheduleNextRun(data.next_run_time);      // ✓
setScheduleServerTime(data.server_time);     // ✓
```

**This is correctly aligned.** ✓

The POST `/api/schedule` returns `{"status": ..., "schedule": ..., "info": scheduler_manager.get_info()}`. The frontend reads `data.info.next_run_time` and `data.info.server_time` — **also correctly aligned.** ✓

---

## 4. Minor Logic Issues

### 4.1 SystemHealth Empty Services — Misleading Icon

**File:** `src/components/SystemHealth.jsx` (line 60)

```js
{services.every(s => s.status === 'ok') ? <ShieldCheck /> : <AlertCircle />}
```

`Array.every()` on an empty array returns `true`. If no pipeline run has occurred and `services = []`, the UI shows the green `ShieldCheck` ("healthy") icon even though no services have been verified. This is semantically incorrect.

---

### 4.2 Stale Inline Pipeline-Start in DailyIntelligence

**File:** `src/components/DailyIntelligence.jsx` (lines 55–63)

The "Generate Intelligence" button has an inline `fetch('/api/pipeline/run', {method: 'POST'})` call that bypasses the global `pipelineRunning` state managed in `App.jsx`. If a user clicks this button, the pipeline starts but the header's "Syncing" indicator won't activate and the page won't auto-refresh stories when complete. It triggers an `alert()` that incorrectly promises "the page will refresh automatically" — which it won't.

---

## Issue Summary Table

| # | File | Type | Severity | Description |
|---|------|------|----------|-------------|
| 1 | `App.jsx` | Render | Medium | Duplicate `<ToastContainer>` — one instance always empty |
| 2 | `SettingsView.jsx` | Render / Performance | Medium | All tab components mount eagerly; SystemHealth polls even when inactive |
| 3 | `App.jsx` + `Sidebar.jsx` | Render / UX | High | Mobile sidebar permanently hidden; `mobileMenuOpen` state unused |
| 4 | `StoryCard.jsx` | Render / Crash | Medium | `story.source.charAt(0)` — no null guard, throws TypeError |
| 5 | `StoryCard.jsx` | API Mismatch | High | `/api/media/${id}` → wrong path & wrong field (`media` vs `images`) |
| 6 | `StoryCard.jsx` | API Mismatch | High | `/api/generate/image` → should be `/api/media/generate-image` |
| 7 | `StoryCard.jsx` | API Mismatch | High | `/api/generate/quote-card` → endpoint does not exist in backend |
| 8 | `DashboardStats.jsx` | Sync / Data | Medium | `avg_quality_score` never returned by backend; always renders `0%` |
| 9 | `EnhancedAnalytics.jsx` | Sync / Architecture | Medium | Analytics fetches raw stories instead of `/api/analytics/summary` |
| 10 | `App.jsx` | UX / Placeholder | Low | QuickActions "Generate Content" is an unimplemented `alert()` |
| 11 | `SystemHealth.jsx` | Logic | Low | `services.every(...)` on empty array shows healthy icon when no data |
| 12 | `DailyIntelligence.jsx` | Sync / UX | Low | Inline pipeline trigger bypasses global loading state; false refresh promise |

---

*Report generated by static analysis — no runtime tests were executed and no code was modified.*
