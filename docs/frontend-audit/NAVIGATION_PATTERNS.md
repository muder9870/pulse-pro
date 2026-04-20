# Navigation Patterns Guide

**Purpose:** Developer reference for implementing consistent navigation across Pulse Pro frontend  
**Last Updated:** 2024-01-15  
**Status:** ✅ Complete  
**Source:** Navigation Audit Report (Task 43)

## Overview

This guide documents URL structure, parameter conventions, and navigation best practices for the Pulse Pro frontend application. Use this as a reference when implementing new features or modifying existing navigation flows.

---

## URL Structure Reference

### Primary Routes

| Route | View | Purpose |
|-------|------|---------|
| `/` | DashboardView | Command center / home page |
| `/articles` | ArticlesView | Article feed with filtering |
| `/analytics` | AnalyticsView | Performance metrics |
| `/calendar` | CalendarView | Editorial calendar |
| `/media` | MediaView | Media asset manager |
| `/research` | ResearchView | Research paper hub |
| `/podcast` | PodcastView | Podcast studio |
| `/settings` | SettingsView | Settings hub |

### Route Aliases

Aliases provide convenient shortcuts to specific views or settings tabs:

| Alias | Target | Use Case |
|-------|--------|----------|
| `/metrics` | `/analytics` | Alternative name for analytics |
| `/monetization` | `/settings?tab=monetization` | Direct link to monetization settings |
| `/monetize` | `/settings?tab=monetization` | Shorter alias for monetization |
| `/health` | `/settings?tab=health` | Direct link to system health |
| `/webhooks` | `/settings?tab=webhooks` | Direct link to webhooks settings |
| `/rss` | `/settings?tab=rss` | Direct link to RSS settings |
| `/style` | `/settings?tab=style` | Direct link to style profile |
| `/extension` | `/settings?tab=extension` | Direct link to extension settings |

### Dev-Only Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/dev` | DevToolsView | Developer tools |
| `/dev/theme` | ThemeExample | Theme testing |
| `/dev/tokens` | TokenReference | Design token reference |

---

## URL Parameter Conventions

### Design Philosophy: Entity-Specific ID Names

**Intentional Design Decision:** We use entity-specific parameter names (`story`, `paper`) rather than generic names (`id`, `itemId`) to provide semantic clarity and make URLs self-documenting.

**Benefits:**
- URLs are self-explanatory: `/articles?story=123` vs `/articles?id=123`
- Code is more readable: `searchParams.get('story')` vs `searchParams.get('id')`
- Prevents ambiguity when multiple entity types exist
- Makes debugging easier (clear what entity type the ID refers to)

### ArticlesView Parameters

**Route:** `/articles`

| Parameter | Type | Values | Purpose | Example |
|-----------|------|--------|---------|---------|
| `story` | string | Story ID | Deep link to specific story | `/articles?story=abc123` |
| `filter` | string | `analyzed`, `ready`, `pending` | Filter articles by status | `/articles?filter=ready` |

**Implementation:**
```javascript
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();

// Read story parameter
const storyId = searchParams.get('story');

// Read filter parameter
const filterParam = searchParams.get('filter');
if (filterParam === 'analyzed') {
  setFilters(prev => ({ ...prev, hasAnalysis: true }));
}
```

**Navigation Examples:**
```javascript
// From Dashboard Intel Card to specific story
navigate(`/articles?story=${story.id}`);

// From Dashboard KPI Card with filter
navigate('/articles?filter=analyzed');

// Combined parameters
navigate(`/articles?story=${id}&filter=ready`);
```

### SettingsView Parameters

**Route:** `/settings`

| Parameter | Type | Values | Purpose | Example |
|-----------|------|--------|---------|---------|
| `tab` | string | `monetization`, `health`, `webhooks`, `rss`, `style`, `extension`, `llm`, `theme`, `advanced`, `keywords` | Select settings tab | `/settings?tab=integrations` |

**Implementation:**
```javascript
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();

// Read tab parameter
const activeTab = searchParams.get('tab') || 'general';

// Update tab parameter
const handleTabChange = (tabId) => {
  setSearchParams({ tab: tabId });
};
```

**Navigation Examples:**
```javascript
// Navigate to specific tab
navigate('/settings?tab=monetization');

// Use route alias (preferred for common tabs)
navigate('/monetization');

// Update tab without full navigation
setSearchParams({ tab: 'health' });
```

### CalendarView Parameters

**Route:** `/calendar`

| Parameter | Type | Values | Purpose | Example |
|-----------|------|--------|---------|---------|
| `date` | string | ISO date (YYYY-MM-DD) | Navigate to specific date | `/calendar?date=2024-01-15` |

**Implementation:**
```javascript
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();

// Read date parameter
const dateParam = searchParams.get('date');
if (dateParam) {
  const targetDate = new Date(dateParam);
  // Navigate to date and highlight
}

// Set date parameter on date cell click
const handleDateClick = (date) => {
  const dateStr = date.toISOString().split('T')[0];
  navigate(`/calendar?date=${dateStr}`);
};
```

**Navigation Examples:**
```javascript
// Navigate to specific date
navigate('/calendar?date=2024-01-15');

// Navigate to today
const today = new Date().toISOString().split('T')[0];
navigate(`/calendar?date=${today}`);
```

### ResearchView Parameters

**Route:** `/research`

| Parameter | Type | Values | Purpose | Example |
|-----------|------|--------|---------|---------|
| `paper` | string | Paper ID | Deep link to specific paper | `/research?paper=123` |

**Implementation:**
```javascript
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();

// Read paper parameter (auto-opens modal)
const paperId = searchParams.get('paper');
useEffect(() => {
  if (paperId) {
    setSelectedPaper(papers.find(p => p.id === paperId));
  }
}, [paperId, papers]);

// Set paper parameter on card click
const handlePaperClick = (paper) => {
  setSearchParams({ paper: paper.id });
};

// Clear parameter on modal close
const handleModalClose = () => {
  setSearchParams({});
};
```

**Navigation Examples:**
```javascript
// From Dashboard Intel Card (arXiv papers)
navigate(`/research?paper=${story.id}`);

// From research card click
setSearchParams({ paper: paper.id });

// Clear modal
setSearchParams({});
```

---

## Navigation Methods

### Programmatic Navigation

Use `useNavigate()` from react-router-dom for navigation between views:

```javascript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Simple navigation
navigate('/articles');

// Navigation with parameters
navigate(`/articles?story=${id}`);
navigate('/articles?filter=ready');

// Navigation with state (not visible in URL)
navigate('/articles', { state: { fromDashboard: true } });
```

### URL Parameter Management

Use `useSearchParams()` for reading and updating URL parameters:

```javascript
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();

// Read parameter
const storyId = searchParams.get('story');

// Set single parameter
setSearchParams({ tab: 'health' });

// Set multiple parameters
setSearchParams({ story: id, filter: 'ready' });

// Clear all parameters
setSearchParams({});

// Update parameter while preserving others
setSearchParams(prev => {
  const newParams = new URLSearchParams(prev);
  newParams.set('filter', 'analyzed');
  return newParams;
});
```

### Navigation Patterns by Use Case

#### 1. Dashboard → Articles (with story)

**Use Case:** User clicks Intel Card to view specific story

```javascript
// DashboardView.jsx
const handleIntelCardClick = (story) => {
  if (story.source === 'arxiv') {
    navigate(`/research?paper=${story.id}`);
  } else {
    navigate(`/articles?story=${story.id}`);
  }
};
```

```javascript
// ArticlesView.jsx
const [searchParams] = useSearchParams();

useEffect(() => {
  const storyId = searchParams.get('story');
  if (storyId && !loading && stories.length > 0) {
    setTimeout(() => {
      const element = document.getElementById(`story-${storyId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.boxShadow = '0 0 0 3px var(--accent)';
        setTimeout(() => element.style.boxShadow = '', 2000);
      }
    }, 100);
  }
}, [searchParams, loading, stories]);
```

#### 2. Dashboard → Articles (with filter)

**Use Case:** User clicks KPI Card to view filtered articles

```javascript
// DashboardView.jsx
const handleKPIClick = (type) => {
  switch (type) {
    case 'analyzed':
      navigate('/articles?filter=analyzed');
      break;
    case 'ready':
      navigate('/articles?filter=ready');
      break;
    default:
      navigate('/articles');
  }
};
```

```javascript
// ArticlesView.jsx
useEffect(() => {
  const filterParam = searchParams.get('filter');
  if (filterParam === 'analyzed') {
    setFilters(prev => ({ ...prev, hasAnalysis: true }));
  } else if (filterParam === 'ready') {
    setFilters(prev => ({ ...prev, hasContent: true }));
  }
}, [searchParams]);
```

#### 3. Settings Tab Navigation

**Use Case:** User clicks settings tab

```javascript
// SettingsView.jsx
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'general';

const handleTabClick = (tabId) => {
  setSearchParams({ tab: tabId });
};

// Render tabs
tabs.map(tab => (
  <button
    key={tab.id}
    onClick={() => handleTabClick(tab.id)}
    className={activeTab === tab.id ? 'active' : ''}
  >
    {tab.label}
  </button>
))
```

#### 4. Calendar Date Navigation

**Use Case:** User clicks calendar date cell

```javascript
// CalendarView.jsx
const handleDateClick = (date) => {
  const dateStr = date.toISOString().split('T')[0];
  navigate(`/calendar?date=${dateStr}`);
};

// Read date parameter
useEffect(() => {
  const dateParam = searchParams.get('date');
  if (dateParam) {
    const targetDate = new Date(dateParam);
    setSelectedDate(targetDate);
    // Highlight date in calendar
  }
}, [searchParams]);
```

#### 5. Research Paper Modal

**Use Case:** User clicks research paper card

```javascript
// ResearchView.jsx
const [searchParams, setSearchParams] = useSearchParams();

const handlePaperClick = (paper) => {
  setSearchParams({ paper: paper.id });
};

const handleModalClose = () => {
  setSearchParams({});
};

// Auto-open modal from URL parameter
useEffect(() => {
  const paperId = searchParams.get('paper');
  if (paperId) {
    const paper = papers.find(p => p.id === paperId);
    if (paper) {
      setSelectedPaper(paper);
    }
  } else {
    setSelectedPaper(null);
  }
}, [searchParams, papers]);
```

---

## Browser Back/Forward Support

### Requirements

All URL parameter changes MUST support browser back/forward navigation:

- ✅ Clicking back restores previous view state
- ✅ Clicking forward restores next view state
- ✅ URL parameters sync with view state
- ✅ Scroll position preserved where appropriate

### Implementation Guidelines

**Use `setSearchParams()` for bidirectional sync:**

```javascript
// ✅ Good - Supports back/forward
const handleTabChange = (tabId) => {
  setSearchParams({ tab: tabId });
};

// ❌ Bad - Doesn't support back/forward
const handleTabChange = (tabId) => {
  setActiveTab(tabId);
};
```

**Read parameters on mount and when they change:**

```javascript
// ✅ Good - Responds to back/forward
useEffect(() => {
  const tab = searchParams.get('tab') || 'general';
  setActiveTab(tab);
}, [searchParams]);

// ❌ Bad - Only reads on mount
useEffect(() => {
  const tab = searchParams.get('tab') || 'general';
  setActiveTab(tab);
}, []); // Missing searchParams dependency
```

---

## Common Navigation Flows

### Flow 1: Dashboard → Articles → Story Detail

```
User Journey:
1. User views Dashboard
2. User clicks Intel Card
3. User navigates to ArticlesView with story ID
4. ArticlesView scrolls to and highlights story
5. User clicks browser back
6. User returns to Dashboard

Implementation:
Dashboard: navigate(`/articles?story=${story.id}`)
Articles: Read story param, scroll to element
Back: Browser handles automatically
```

### Flow 2: Dashboard → Articles (Filtered)

```
User Journey:
1. User views Dashboard
2. User clicks "AI Processed" KPI Card
3. User navigates to ArticlesView with filter
4. ArticlesView applies analyzed filter
5. User clicks browser back
6. User returns to Dashboard

Implementation:
Dashboard: navigate('/articles?filter=analyzed')
Articles: Read filter param, apply to state
Back: Browser handles automatically
```

### Flow 3: Settings Tab Navigation

```
User Journey:
1. User views Settings (General tab)
2. User clicks "Monetization" tab
3. URL updates to /settings?tab=monetization
4. User clicks "Health" tab
5. URL updates to /settings?tab=health
6. User clicks browser back
7. User returns to Monetization tab

Implementation:
Settings: setSearchParams({ tab: tabId })
Back/Forward: Browser handles automatically
```

### Flow 4: Calendar Date Selection

```
User Journey:
1. User views Calendar (current month)
2. User clicks date cell (Jan 15)
3. URL updates to /calendar?date=2024-01-15
4. Calendar highlights selected date
5. User clicks browser back
6. Calendar returns to current month view

Implementation:
Calendar: navigate(`/calendar?date=${dateStr}`)
Back: Browser handles automatically
```

---

## Best Practices

### 1. Use Entity-Specific Parameter Names

```javascript
// ✅ Good - Self-documenting
navigate(`/articles?story=${id}`);
navigate(`/research?paper=${id}`);

// ❌ Bad - Ambiguous
navigate(`/articles?id=${id}`);
navigate(`/research?id=${id}`);
```

### 2. Preserve Context in URLs

```javascript
// ✅ Good - Context preserved
navigate(`/articles?story=${id}&filter=ready`);

// ❌ Bad - Context lost
navigate(`/articles?story=${id}`);
// Filter state lost on navigation
```

### 3. Handle Missing/Invalid Parameters Gracefully

```javascript
// ✅ Good - Graceful fallback
const storyId = searchParams.get('story');
const story = stories.find(s => s.id === storyId);
if (!story) {
  // Just show all stories, no error
  return;
}

// ❌ Bad - Throws error
const storyId = searchParams.get('story');
const story = stories.find(s => s.id === storyId);
scrollToStory(story.id); // Crashes if story not found
```

### 4. Use Route Aliases for Common Destinations

```javascript
// ✅ Good - Use alias
navigate('/monetization');

// ⚠️ Acceptable - Full path
navigate('/settings?tab=monetization');
```

### 5. Clear Parameters When Closing Modals

```javascript
// ✅ Good - Clears parameter
const handleModalClose = () => {
  setSearchParams({});
  setSelectedPaper(null);
};

// ❌ Bad - Parameter remains in URL
const handleModalClose = () => {
  setSelectedPaper(null);
  // URL still shows ?paper=123
};
```

### 6. Use `setTimeout` for Scroll-to-Element

```javascript
// ✅ Good - Waits for render
useEffect(() => {
  const storyId = searchParams.get('story');
  if (storyId) {
    setTimeout(() => {
      const element = document.getElementById(`story-${storyId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}, [searchParams]);

// ❌ Bad - Element may not exist yet
useEffect(() => {
  const storyId = searchParams.get('story');
  const element = document.getElementById(`story-${storyId}`);
  element.scrollIntoView(); // May fail if not rendered
}, [searchParams]);
```

### 7. Add ID Attributes for Deep Linking

```javascript
// ✅ Good - Enables getElementById
{stories.map(story => (
  <div key={story.id} id={`story-${story.id}`}>
    <StoryCard story={story} />
  </div>
))}

// ❌ Bad - Can't target for scroll
{stories.map(story => (
  <StoryCard key={story.id} story={story} />
))}
```

### 8. Validate Date Parameters

```javascript
// ✅ Good - Validates date format
const dateParam = searchParams.get('date');
if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
  const date = new Date(dateParam);
  if (!isNaN(date.getTime())) {
    setSelectedDate(date);
  }
}

// ❌ Bad - No validation
const dateParam = searchParams.get('date');
setSelectedDate(new Date(dateParam)); // May be invalid
```

---

## Error Handling

### Invalid Story/Paper IDs

**Behavior:** Gracefully ignore, show default view

```javascript
const storyId = searchParams.get('story');
if (storyId) {
  const story = stories.find(s => s.id === storyId);
  if (story) {
    scrollToStory(story.id);
  }
  // If not found, just show all stories (no error)
}
```

### Invalid Filter Values

**Behavior:** Ignore invalid values, use default

```javascript
const filterParam = searchParams.get('filter');
const validFilters = ['analyzed', 'ready', 'pending'];

if (validFilters.includes(filterParam)) {
  applyFilter(filterParam);
} else {
  // Invalid filter, use default (show all)
}
```

### Invalid Date Formats

**Behavior:** Validate format, fall back to current date

```javascript
const dateParam = searchParams.get('date');
let targetDate = new Date();

if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
  const parsed = new Date(dateParam);
  if (!isNaN(parsed.getTime())) {
    targetDate = parsed;
  }
}

setSelectedDate(targetDate);
```

### 404 Errors

**Behavior:** Catch with error boundary, show NotFoundView

```javascript
// App.jsx
<Routes>
  <Route path="/" element={<DashboardView />} />
  <Route path="/articles" element={<ArticlesView />} />
  {/* ... other routes */}
  <Route path="*" element={<NotFoundView />} />
</Routes>
```

---

## Testing Navigation

### Unit Tests

```javascript
describe('ArticlesView Navigation', () => {
  it('scrolls to story when story ID in URL', async () => {
    const { container } = render(<ArticlesView />, {
      initialEntries: ['/articles?story=abc123']
    });

    await waitFor(() => {
      const element = container.querySelector('#story-abc123');
      expect(element).toHaveStyle({ boxShadow: '0 0 0 3px var(--accent)' });
    });
  });

  it('applies filter when filter param in URL', () => {
    render(<ArticlesView />, {
      initialEntries: ['/articles?filter=ready']
    });

    expect(screen.getByText(/content ready/i)).toBeInTheDocument();
  });

  it('handles missing story gracefully', () => {
    const { container } = render(<ArticlesView />, {
      initialEntries: ['/articles?story=nonexistent']
    });

    // Should not crash, just show all articles
    expect(container.querySelector('.story-card')).toBeInTheDocument();
  });
});
```

### Integration Tests

```javascript
describe('Dashboard to Articles Navigation', () => {
  it('navigates to specific story from Intel Card', async () => {
    const { getByText } = render(<App />);

    const intelCard = getByText('Deep Dive →');
    fireEvent.click(intelCard);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/articles');
      expect(window.location.search).toContain('story=');
    });
  });

  it('preserves filter when navigating from KPI Card', async () => {
    const { getByText } = render(<App />);

    const kpiCard = getByText('AI Processed');
    fireEvent.click(kpiCard);

    await waitFor(() => {
      expect(window.location.search).toBe('?filter=analyzed');
    });
  });
});
```

### E2E Tests

```javascript
test('Complete navigation flow', async ({ page }) => {
  await page.goto('/dashboard');

  // Click Intel Card
  await page.click('[data-testid="intel-card-0"]');

  // Verify navigation
  await expect(page).toHaveURL(/\/articles\?story=/);

  // Verify story is highlighted
  const story = page.locator('[data-testid="story-card"]').first();
  await expect(story).toHaveCSS('box-shadow', /var\(--accent\)/);

  // Test browser back
  await page.goBack();
  await expect(page).toHaveURL('/dashboard');

  // Test browser forward
  await page.goForward();
  await expect(page).toHaveURL(/\/articles\?story=/);
});
```

---

## Migration Guide

### Adding Navigation to New Views

1. **Define URL structure:**
   ```
   /myview                    - Base route
   /myview?item={id}          - Deep link to item
   /myview?filter={type}      - Filtered view
   ```

2. **Add route to App.jsx:**
   ```javascript
   <Route path="/myview" element={<MyView />} />
   ```

3. **Implement parameter reading:**
   ```javascript
   const [searchParams] = useSearchParams();
   const itemId = searchParams.get('item');
   const filter = searchParams.get('filter');
   ```

4. **Add navigation from other views:**
   ```javascript
   navigate(`/myview?item=${id}`);
   ```

5. **Test browser back/forward:**
   - Navigate to view
   - Click back
   - Verify state restoration

### Updating Existing Navigation

1. **Audit current implementation:**
   - Check for hardcoded URLs
   - Check for missing parameter support
   - Check for broken back/forward behavior

2. **Standardize parameter names:**
   - Use entity-specific names (`story`, `paper`)
   - Use consistent filter names (`filter`, not `type`)
   - Use consistent tab names (`tab`, not `section`)

3. **Add URL parameter sync:**
   ```javascript
   // Before
   const [activeTab, setActiveTab] = useState('general');

   // After
   const [searchParams, setSearchParams] = useSearchParams();
   const activeTab = searchParams.get('tab') || 'general';
   const setActiveTab = (tab) => setSearchParams({ tab });
   ```

4. **Test thoroughly:**
   - Direct navigation
   - Browser back/forward
   - Invalid parameters
   - Missing parameters

---

## Troubleshooting

### Issue: Scroll-to-element not working

**Cause:** Element not rendered yet when scroll attempted

**Solution:** Add setTimeout delay
```javascript
setTimeout(() => {
  const element = document.getElementById(`story-${storyId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, 100);
```

### Issue: Browser back doesn't restore state

**Cause:** Using local state instead of URL parameters

**Solution:** Use `setSearchParams()` instead of `setState()`
```javascript
// Before
const [activeTab, setActiveTab] = useState('general');

// After
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'general';
```

### Issue: Parameters not updating

**Cause:** Missing dependency in useEffect

**Solution:** Add searchParams to dependency array
```javascript
useEffect(() => {
  const tab = searchParams.get('tab');
  setActiveTab(tab);
}, [searchParams]); // ✅ Include searchParams
```

### Issue: Infinite re-render loop

**Cause:** Setting parameters inside useEffect without proper conditions

**Solution:** Add conditional check
```javascript
useEffect(() => {
  const tab = searchParams.get('tab');
  if (!tab) {
    setSearchParams({ tab: 'general' }); // Only set if missing
  }
}, [searchParams]);
```

---

## Summary

### Key Takeaways

1. **Use entity-specific parameter names** (`story`, `paper`) for clarity
2. **Preserve context in URLs** for deep linking and sharing
3. **Support browser back/forward** with `setSearchParams()`
4. **Handle invalid parameters gracefully** (no errors, just fallbacks)
5. **Use route aliases** for common destinations
6. **Test navigation thoroughly** (unit, integration, E2E)

### Quick Reference

| View | Parameters | Example |
|------|------------|---------|
| Articles | `story`, `filter` | `/articles?story=123&filter=ready` |
| Settings | `tab` | `/settings?tab=monetization` |
| Calendar | `date` | `/calendar?date=2024-01-15` |
| Research | `paper` | `/research?paper=456` |

### Navigation Methods

| Method | Use Case | Example |
|--------|----------|---------|
| `navigate()` | Cross-view navigation | `navigate('/articles')` |
| `setSearchParams()` | Update URL parameters | `setSearchParams({ tab: 'health' })` |
| `searchParams.get()` | Read URL parameters | `searchParams.get('story')` |

---

**End of Navigation Patterns Guide**
