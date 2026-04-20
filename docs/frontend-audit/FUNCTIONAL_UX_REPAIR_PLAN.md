# Pulse Pro — Functional + UX Repair Plan

**Based on:** FUNCTIONAL_UX_AUDIT.md  
**Objective:** Transform Dashboard and System Hub from visually decent to fully functional and actionable

---

## Repair Strategy

### Approach
- **Phased execution:** Complete → Test → Commit → Next phase
- **Zero regressions:** Maintain design system consistency
- **Incremental improvements:** Small, testable changes
- **User-centric:** Every change improves actual user workflow

### Testing Protocol
1. Make changes
2. Run `docker compose up --build`
3. Manual testing in browser
4. User confirmation
5. Git commit with descriptive message
6. Proceed to next phase

---

## Phase 1: Remove Dead Code & Wire Critical Interactions

**Goal:** Eliminate non-functional UI elements and wire essential interactions  
**Time Estimate:** 2-3 hours  
**Files:** `frontend/src/views/DashboardView.jsx`

### Tasks

#### T1.1: Remove Hidden Page Header
**Issue:** Entire header section with `display: 'none'` containing duplicate controls

**Location:** `DashboardView.jsx` lines ~165-185

**Action:**
```jsx
// REMOVE this entire block:
<div style={{ display: 'none' }}>
  <div>
    <div style={{ fontFamily: 'var(--font-display)', ... }}>
      Command Center
    </div>
    ...
  </div>
  <div style={{ display: 'flex', gap: 8 }}>
    <button onClick={() => navigate('/settings')}>⚙ Settings</button>
    <button onClick={handleRunPipeline}>▶ Run Pipeline</button>
  </div>
</div>
```

**Rationale:** Dead code that adds confusion. Hero banner already has these actions.

---

#### T1.2: Wire Setup Guide Dismiss Button
**Issue:** Dismiss button has no `onClick` handler

**Location:** `DashboardView.jsx` line ~240

**Current:**
```jsx
<button style={{ background: 'none', border: 'none', cursor: 'pointer', ... }}>
  Dismiss
</button>
```

**Fix:**
```jsx
const [setupDismissed, setSetupDismissed] = React.useState(() => {
  return localStorage.getItem('pulse-setup-dismissed') === 'true';
});

const handleDismissSetup = () => {
  localStorage.setItem('pulse-setup-dismissed', 'true');
  setSetupDismissed(true);
};

// In render:
{!setupDismissed && (
  <div style={{ background: 'linear-gradient(135deg, ...' }}>
    {/* Setup Guide content */}
    <button onClick={handleDismissSetup} style={{ ... }}>
      Dismiss
    </button>
  </div>
)}
```

**Rationale:** Users should be able to dismiss the setup guide once completed.

---

#### T1.3: Remove Duplicate Pipeline Warning
**Issue:** "Pipeline idle" warning in System Ecosystem duplicates hero CTA

**Location:** `DashboardView.jsx` lines ~360-375

**Action:** Remove the entire warning block:
```jsx
// REMOVE:
<div style={{ background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.2)', ... }}>
  <span style={{ fontSize: 14 }}>⚠</span>
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)' }}>Pipeline idle</div>
    <div style={{ fontSize: 10, color: 'var(--text2)' }}>Run now to fetch today's content</div>
  </div>
  <button onClick={handleRunPipeline} style={{ ... }}>Run Now</button>
</div>
```

**Rationale:** Hero banner already has primary "Run Pipeline" CTA. This adds noise.

---

## Phase 2: Make Metrics Actionable

**Goal:** Wire all metric cards to navigation/filtering  
**Time Estimate:** 2-3 hours  
**Files:** `frontend/src/views/DashboardView.jsx`, `frontend/src/views/ArticlesView.jsx`

### Tasks

#### T2.1: Make KPI Cards Clickable
**Issue:** KPI cards show metrics but aren't clickable

**Location:** `DashboardView.jsx` lines ~60-75 (KpiCard component)

**Current:**
```jsx
const KpiCard = ({ label, value, trend, trendUp, sub }) => (
  <div
    style={{ ...card, padding: '16px 18px', transition: 'border-color 0.15s', cursor: 'default' }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
  >
    ...
  </div>
);
```

**Fix:**
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
    ...
  </div>
);

// Usage:
<KpiCard 
  label="Intelligence Base" 
  value={totalArticles} 
  trend={`+${Math.min(12, totalArticles)} today`} 
  trendUp 
  onClick={() => navigate('/articles')}
/>
<KpiCard 
  label="AI Processed" 
  value={analyzed} 
  sub={`${qualityPct}% coverage`} 
  trendUp 
  onClick={() => navigate('/articles?filter=analyzed')}
/>
<KpiCard 
  label="Quality Index" 
  value={`${qualityPct}%`} 
  trend="needs more analysis" 
  trendUp={qualityPct > 50} 
  onClick={() => navigate('/analytics')}
/>
<KpiCard 
  label="Content Ready" 
  value={contentReady} 
  sub={contentReady > 0 ? `${contentReady} to publish` : 'Run pipeline'} 
  onClick={() => contentReady > 0 ? navigate('/articles?filter=ready') : handleRunPipeline()}
/>
```

**Rationale:** Metrics should lead to detailed views. Click = "show me more about this metric."

---

#### T2.2: Wire System Ecosystem Cards
**Issue:** System Ecosystem cards are static displays

**Location:** `DashboardView.jsx` lines ~330-360

**Current:**
```jsx
{[
  { label: 'INTELLIGENCE BASE', value: totalArticles, badge: 'Active', ... },
  { label: 'AI ANALYZED', value: analyzed, badge: `${qualityPct}%`, ... },
  { label: 'POSTS GENERATED', value: contentReady, badge: 'Ready', ... },
  { label: 'DEEP DIVES', value: stories.filter(s => s.has_deep_analysis).length, badge: 'Actionable', ... },
].map((item, i) => (
  <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', ... }}>
    ...
  </div>
))}
```

**Fix:**
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
  { 
    label: 'AI ANALYZED', 
    value: analyzed, 
    badge: `${qualityPct}%`, 
    badgeColor: 'var(--accent)', 
    badgeBg: 'var(--accent-glow)',
    onClick: () => navigate('/articles?filter=analyzed')
  },
  { 
    label: 'POSTS GENERATED', 
    value: contentReady, 
    badge: 'Ready', 
    badgeColor: 'var(--teal)', 
    badgeBg: 'var(--teal-dim)',
    onClick: () => contentReady > 0 ? navigate('/articles?filter=ready') : handleRunPipeline()
  },
  { 
    label: 'DEEP DIVES', 
    value: stories.filter(s => s.has_deep_analysis).length, 
    badge: 'Actionable', 
    badgeColor: 'var(--amber)', 
    badgeBg: 'var(--amber-dim)',
    onClick: () => navigate('/research')
  },
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
    ...
  </div>
))}
```

**Rationale:** Same as KPI cards — metrics should be actionable.

---

#### T2.3: Fix Intel Card "Deep Dive" Navigation
**Issue:** "Deep Dive" button navigates to generic `/articles` instead of specific story

**Location:** `DashboardView.jsx` lines ~90-120 (IntelCard component)

**Current:**
```jsx
<button
  onClick={e => { e.stopPropagation(); onClick(); }}
  style={{ ... }}
>
  Deep Dive →
</button>

// Usage:
<IntelCard key={story.id} story={story} onClick={() => navigate('/articles')} />
```

**Fix:**
```jsx
// Option 1: Navigate to articles with story ID in URL
<IntelCard 
  key={story.id} 
  story={story} 
  onClick={() => navigate(`/articles?story=${story.id}`)} 
/>

// Option 2: Open story detail modal (if implemented)
<IntelCard 
  key={story.id} 
  story={story} 
  onClick={() => {
    // Dispatch custom event to open story detail
    window.dispatchEvent(new CustomEvent('open-story-details', { 
      detail: { storyId: story.id } 
    }));
  }} 
/>
```

**Rationale:** "Deep Dive" should open the specific story, not a generic list.

---

#### T2.4: Fix Priority Picks Navigation
**Issue:** Priority rows navigate to generic `/articles`

**Location:** `DashboardView.jsx` lines ~125-140 (PriorityRow component)

**Current:**
```jsx
<PriorityRow key={story.id} story={story} onClick={() => navigate('/articles')} />
```

**Fix:**
```jsx
<PriorityRow 
  key={story.id} 
  story={story} 
  onClick={() => navigate(`/articles?story=${story.id}`)} 
/>
```

**Rationale:** Same as Intel Cards — navigate to specific story.

---

#### T2.5: Add URL Filter Support to ArticlesView
**Issue:** ArticlesView doesn't read `?filter=` or `?story=` from URL

**Location:** `frontend/src/views/ArticlesView.jsx`

**Add:**
```jsx
import { useSearchParams } from 'react-router-dom';

const ArticlesView = ({ ... }) => {
  const [searchParams] = useSearchParams();
  
  // Read filter from URL
  React.useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'analyzed') {
      setFilters(prev => ({ ...prev, hasAnalysis: true }));
    } else if (filterParam === 'ready') {
      setFilters(prev => ({ ...prev, hasContent: true }));
    }
  }, [searchParams, setFilters]);
  
  // Read story ID from URL and auto-expand
  React.useEffect(() => {
    const storyId = searchParams.get('story');
    if (storyId) {
      // Scroll to story and expand it
      const storyElement = document.getElementById(`story-${storyId}`);
      if (storyElement) {
        storyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Trigger expand (if StoryCard supports it)
      }
    }
  }, [searchParams]);
  
  // ... rest of component
};
```

**Rationale:** Enable deep linking from Dashboard metrics to filtered views.

---

## Phase 3: Reduce Redundancy & Establish Hierarchy

**Goal:** Merge duplicate sections and create clear visual hierarchy  
**Time Estimate:** 2-3 hours  
**Files:** `frontend/src/views/DashboardView.jsx`

### Tasks

#### T3.1: Merge KPI Cards + System Ecosystem
**Issue:** Both sections show identical metrics

**Strategy:** Keep ONE section with enhanced functionality

**Option A: Keep KPI Cards, Remove System Ecosystem**
- KPI Cards are more prominent and better designed
- Remove System Ecosystem section entirely
- Wire KPI Cards with onClick handlers (done in T2.1)

**Option B: Keep System Ecosystem, Remove KPI Cards**
- System Ecosystem has more context (badges, labels)
- Remove KPI Cards section
- Wire System Ecosystem cards (done in T2.2)

**Recommendation:** **Option A** — KPI Cards are cleaner and more scannable

**Action:**
```jsx
// REMOVE System Ecosystem section (lines ~320-375):
<div style={{ ...card, padding: '16px 18px' }}>
  <SectionLabel>System Ecosystem</SectionLabel>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
    {/* ... System Ecosystem cards ... */}
  </div>
  {/* Pipeline idle warning */}
</div>
```

**Rationale:** Eliminate duplicate metrics, reduce visual noise.

---

#### T3.2: Merge Priority Picks into Intelligence Feed
**Issue:** Priority Picks sidebar duplicates Intelligence Feed data

**Strategy:** Show top 4-6 stories in Intelligence Feed, remove Priority Picks

**Action:**
```jsx
// Change intelCards from 3 to 6:
const intelCards = React.useMemo(() =>
  [...stories].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)).slice(0, 6),
  [stories]
);

// Update grid to 3 columns:
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'stretch' }}>
  {intelCards.map(story => (
    <IntelCard key={story.id} story={story} onClick={() => navigate(`/articles?story=${story.id}`)} />
  ))}
</div>

// REMOVE Priority Picks section (lines ~280-310):
<div>
  <SectionLabel sub="Top Scored">Priority Picks</SectionLabel>
  <div style={{ ...card, padding: '12px 14px' }}>
    {/* ... Priority Picks content ... */}
  </div>
</div>
```

**Update main grid:**
```jsx
// Change from 2-col to 1-col:
<div style={{ marginBottom: 18 }}>
  {/* Intel Feed (full width, 3 columns of cards) */}
</div>
```

**Rationale:** Reduce redundancy, simplify layout.

---

#### T3.3: Reorder Sections by Priority
**Issue:** No clear hierarchy — 9 sections compete for attention

**New Order:**
1. Hero Banner (primary CTA)
2. Today's Focus (conditional alert)
3. Setup Guide (conditional, dismissible)
4. Live Intelligence Feed (top 6 stories, 3-col grid)
5. KPI Cards (4 clickable metrics)
6. Pipeline Live Status (collapsible)
7. Quick Access (6 navigation tiles)

**Action:** Reorder JSX blocks in `DashboardView.jsx` to match above order.

**Rationale:** Primary actions first, secondary navigation last.

---

#### T3.4: Make Pipeline Status Collapsible
**Issue:** Pipeline status takes up space even when idle

**Action:**
```jsx
const [pipelineExpanded, setPipelineExpanded] = React.useState(false);

// In render:
<div style={{ ...card, padding: '16px 18px', marginBottom: 20 }}>
  <div 
    onClick={() => setPipelineExpanded(!pipelineExpanded)}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      cursor: 'pointer'
    }}
  >
    <SectionLabel>
      <Zap style={{ width: 14, height: 14, color: 'var(--accent)' }} />
      Pipeline Live Status
    </SectionLabel>
    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
      {pipelineExpanded ? '▴' : '▾'}
    </span>
  </div>
  {pipelineExpanded && <PipelineStatus />}
</div>
```

**Rationale:** Reduce visual noise when pipeline is idle.

---

## Phase 4: Polish & Accessibility

**Goal:** Final touches for production quality  
**Time Estimate:** 1-2 hours  
**Files:** Various

### Tasks

#### T4.1: Add Confirmation for Bulk Operations
**Issue:** "Launch All" button triggers bulk generate without confirmation

**Location:** `frontend/src/views/ArticlesView.jsx` line ~95

**Current:**
```jsx
<button
  onClick={() => handleBulkGenerate(filteredStories.map(s => s.id))}
  style={{ ... }}
>
  Launch All {filteredStories.length} →
</button>
```

**Fix:**
```jsx
const handleLaunchAll = () => {
  if (filteredStories.length > 10) {
    if (!window.confirm(`Generate content for ${filteredStories.length} articles? This may take several minutes.`)) {
      return;
    }
  }
  handleBulkGenerate(filteredStories.map(s => s.id));
};

<button onClick={handleLaunchAll} style={{ ... }}>
  Launch All {filteredStories.length} →
</button>
```

**Rationale:** Prevent accidental bulk operations on large datasets.

---

#### T4.2: Improve Empty State Reset Logic
**Issue:** "Reset Filters" invalidates entire query cache (overkill)

**Location:** `frontend/src/views/ArticlesView.jsx` line ~145

**Current:**
```jsx
<button
  onClick={() => { 
    setScoreFilter('all'); 
    handleSourceSelect(null); 
    queryClient.invalidateQueries(['stories']); 
  }}
  style={{ ... }}
>
  Reset Filters
</button>
```

**Fix:**
```jsx
<button
  onClick={() => { 
    setScoreFilter('all'); 
    handleSourceSelect(null); 
    setFilters({}); // Just reset local filters
  }}
  style={{ ... }}
>
  Reset Filters
</button>
```

**Rationale:** Don't refetch data unnecessarily — just reset UI filters.

---

#### T4.3: Add Keyboard Shortcuts Hint
**Issue:** Users may not know about keyboard shortcuts

**Action:** Add subtle hint in Dashboard hero or Quick Access section:

```jsx
<div style={{ 
  fontSize: 10, 
  color: 'var(--text3)', 
  marginTop: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 4
}}>
  <kbd style={{ 
    padding: '2px 6px', 
    borderRadius: 4, 
    background: 'var(--surface2)', 
    border: '1px solid var(--border)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9
  }}>
    ?
  </kbd>
  <span>Press for keyboard shortcuts</span>
</div>
```

**Rationale:** Improve discoverability of power user features.

---

## Testing Checklist

After each phase, verify:

### Phase 1
- [ ] Hidden header removed (no `display: 'none'` blocks)
- [ ] Setup Guide dismiss button works (localStorage persists)
- [ ] Duplicate pipeline warning removed
- [ ] No console errors
- [ ] Docker build succeeds

### Phase 2
- [ ] KPI Cards clickable and navigate correctly
- [ ] System Ecosystem cards clickable (if kept)
- [ ] Intel Cards navigate to specific story
- [ ] Priority Picks navigate to specific story
- [ ] ArticlesView reads URL filters
- [ ] Deep linking works (Dashboard → Articles with filter)

### Phase 3
- [ ] Only ONE metrics section visible (KPI Cards OR System Ecosystem)
- [ ] Priority Picks removed or merged
- [ ] Sections in priority order
- [ ] Pipeline Status collapsible
- [ ] Visual hierarchy clear (primary actions prominent)

### Phase 4
- [ ] Bulk operation confirmation works
- [ ] Empty state reset doesn't refetch
- [ ] Keyboard shortcuts hint visible
- [ ] No accessibility regressions

---

## Git Commit Messages

### Phase 1
```
fix(dashboard): remove dead code and wire critical interactions

- Remove hidden page header with duplicate controls
- Wire Setup Guide dismiss button with localStorage persistence
- Remove duplicate pipeline idle warning
- Clean up dead code for better maintainability
```

### Phase 2
```
feat(dashboard): make all metrics actionable with navigation

- Add onClick handlers to KPI Cards with filtered navigation
- Wire System Ecosystem cards to relevant views
- Fix Intel Card and Priority Picks to navigate to specific stories
- Add URL filter support to ArticlesView for deep linking
- Enable Dashboard → Articles flow with context preservation
```

### Phase 3
```
refactor(dashboard): reduce redundancy and establish clear hierarchy

- Merge KPI Cards and System Ecosystem (remove duplicate metrics)
- Merge Priority Picks into Intelligence Feed (show top 6)
- Reorder sections by priority (primary actions first)
- Make Pipeline Status collapsible to reduce noise
- Improve visual hierarchy and reduce cognitive load
```

### Phase 4
```
polish(ui): add confirmations and improve UX details

- Add confirmation for bulk operations >10 items
- Improve empty state reset logic (don't refetch unnecessarily)
- Add keyboard shortcuts hint for discoverability
- Final accessibility and polish improvements
```

---

## Success Metrics

After all phases complete:

1. **Zero dead interactions** — Every button/card does something
2. **Zero duplicate metrics** — Each data point shown once
3. **100% actionable metrics** — All metrics clickable with clear destination
4. **Clear hierarchy** — Primary action obvious within 2 seconds
5. **Reduced sections** — Dashboard has 5-7 sections (down from 9)
6. **Logical flow** — Dashboard → Articles → Story Detail works seamlessly

---

## Rollback Plan

If any phase causes issues:

1. **Git revert** to previous commit
2. **Identify specific issue** (console errors, broken navigation, etc.)
3. **Fix incrementally** (smaller changes)
4. **Re-test** before proceeding

---

*This repair plan is executable and testable. Each phase is independent and can be completed in 1-3 hours.*
