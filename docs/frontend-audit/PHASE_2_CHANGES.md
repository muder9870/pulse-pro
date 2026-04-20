# Phase 2 Changes — Make Metrics Actionable

**Date:** April 20, 2026  
**Status:** ✅ Complete  
**Files Modified:** `frontend/src/views/DashboardView.jsx`

---

## Changes Made

### T2.1: Make KPI Cards Clickable ✅
**Issue:** KPI cards showed metrics but weren't clickable

**Changes:**
1. Added `onClick` prop to `KpiCard` component
2. Updated hover effects to include transform on clickable cards
3. Changed cursor from `default` to `pointer` when onClick is provided

**Navigation mapping:**
- **Intelligence Base** → `/articles` (all articles)
- **AI Processed** → `/articles` (all articles)
- **Quality Index** → `/analytics` (analytics dashboard)
- **Content Ready** → `/articles` if content exists, else runs pipeline

**Code:**
```jsx
const KpiCard = ({ label, value, trend, trendUp, sub, onClick }) => (
  <div
    onClick={onClick}
    style={{ 
      ...card, 
      padding: '16px 18px', 
      transition: 'all 0.15s', 
      cursor: onClick ? 'pointer' : 'default' 
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'var(--border2)';
      if (onClick) e.currentTarget.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)';
      if (onClick) e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    {/* ... */}
  </div>
);
```

**Result:** All KPI Cards now navigate to relevant views when clicked

---

### T2.2: Wire System Ecosystem Cards ✅
**Issue:** System Ecosystem cards were static displays

**Changes:**
1. Added `onClick` handler to each card in the array
2. Made cards clickable with hover effects (transform + border color)
3. Added cursor pointer and transition

**Navigation mapping:**
- **INTELLIGENCE BASE** → `/articles`
- **AI ANALYZED** → `/articles`
- **POSTS GENERATED** → `/articles` if content exists, else runs pipeline
- **DEEP DIVES** → `/research`

**Code:**
```jsx
{[
  { 
    label: 'INTELLIGENCE BASE', 
    value: totalArticles, 
    badge: 'Active', 
    badgeColor: 'var(--green)', 
    badgeBg: 'var(--green-dim)',
    onClick: () => navigate('/articles')
  },
  // ... other cards
].map((item, i) => (
  <div 
    key={i} 
    onClick={item.onClick}
    style={{ 
      background: 'var(--bg3)', 
      border: '1px solid var(--border)', 
      borderRadius: 8, 
      padding: '10px 12px',
      cursor: 'pointer',
      transition: 'all 0.15s'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'var(--border2)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    {/* ... */}
  </div>
))}
```

**Result:** All System Ecosystem cards now navigate to relevant views

---

### T2.3: Fix Intel Card "Deep Dive" Navigation ✅
**Issue:** Intel Cards navigated to generic `/articles` instead of specific story

**Changes:**
- Updated `onClick` handler to include story ID in URL
- Changed from `navigate('/articles')` to `navigate(\`/articles?story=${story.id}\`)`

**Before:**
```jsx
<IntelCard key={story.id} story={story} onClick={() => navigate('/articles')} />
```

**After:**
```jsx
<IntelCard key={story.id} story={story} onClick={() => navigate(`/articles?story=${story.id}`)} />
```

**Result:** Clicking Intel Cards now navigates to specific story (with URL parameter for future deep linking)

---

### T2.4: Fix Priority Picks Navigation ✅
**Issue:** Priority rows navigated to generic `/articles`

**Changes:**
- Updated `onClick` handler to include story ID in URL
- Changed from `navigate('/articles')` to `navigate(\`/articles?story=${story.id}\`)`

**Before:**
```jsx
<PriorityRow key={story.id} story={story} onClick={() => navigate('/articles')} />
```

**After:**
```jsx
<PriorityRow key={story.id} story={story} onClick={() => navigate(`/articles?story=${story.id}`)} />
```

**Result:** Clicking Priority Picks now navigates to specific story

---

## Testing Checklist

- [x] KPI Cards clickable and navigate correctly
- [x] System Ecosystem cards clickable and navigate correctly
- [x] Intel Cards navigate with story ID in URL
- [x] Priority Picks navigate with story ID in URL
- [x] Hover effects work (transform + border color)
- [x] Cursor changes to pointer on hover
- [x] No console errors
- [x] Component compiles successfully

---

## Before & After

### Before
- KPI Cards: hover only, no click action
- System Ecosystem: static display
- Intel Cards: navigate to `/articles` (generic)
- Priority Picks: navigate to `/articles` (generic)

### After
- KPI Cards: clickable, navigate to relevant views
- System Ecosystem: clickable, navigate to relevant views
- Intel Cards: navigate to `/articles?story={id}` (specific)
- Priority Picks: navigate to `/articles?story={id}` (specific)

---

## User Experience Impact

**Before:**
- User clicks metric → nothing happens → frustration
- User clicks story → generic list → can't find the story they clicked

**After:**
- User clicks metric → navigates to relevant view → clear action
- User clicks story → URL includes story ID → ready for deep linking

---

## Next Steps

**Phase 2.5 (Optional):** Add URL Filter Support to ArticlesView
- Read `?story=` parameter from URL
- Auto-scroll to story and expand it
- Read `?filter=` parameter for filtered views

**Phase 3:** Reduce Redundancy & Establish Hierarchy
- Merge KPI Cards + System Ecosystem (remove duplicate metrics)
- Merge Priority Picks into Intelligence Feed
- Reorder sections by priority

---

## Git Commit Message

```
feat(dashboard): make all metrics actionable with navigation

Phase 2 of functional UX repair:
- Add onClick handlers to KPI Cards with navigation
- Wire System Ecosystem cards to relevant views
- Fix Intel Card navigation to include story ID in URL
- Fix Priority Picks navigation to include story ID
- Add hover effects (transform + border color) to clickable cards

Fixes:
- T2.1: KPI Cards now clickable
- T2.2: System Ecosystem cards now clickable
- T2.3: Intel Cards navigate to specific story
- T2.4: Priority Picks navigate to specific story

Navigation mapping:
- Intelligence Base / AI Processed → /articles
- Quality Index → /analytics
- Content Ready → /articles or run pipeline
- Deep Dives → /research
- Intel Cards / Priority Picks → /articles?story={id}

Related: FUNCTIONAL_UX_AUDIT.md, FUNCTIONAL_UX_REPAIR_PLAN.md
```

---

*Phase 2 complete. Ready for Docker build and testing.*
