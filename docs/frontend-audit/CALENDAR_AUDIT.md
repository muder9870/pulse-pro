# CalendarView Audit Report

**Date:** 2024-01-15  
**Status:** ✅ Complete  
**Auditor:** Kiro AI  
**Scope:** `frontend/src/views/CalendarView.jsx`, `frontend/src/components/ContentCalendar.jsx`

---

## Executive Summary

The CalendarView is an **editorial calendar and scheduling hub** displaying scheduled posts in a monthly calendar grid with an upcoming posts sidebar and a full list of all scheduled posts. The component successfully fetches scheduling data from `/api/schedule/list`, implements functional navigation, and provides post management capabilities.

**Severity Breakdown:**
- **Critical:** 0 issues
- **High:** 2 issues (dead date cell interactions, duplicate event displays)
- **Medium:** 2 issues (missing URL parameter support, unclear primary action)
- **Low:** 1 issue (event indicator dots not clickable)

**Key Findings:**
1. **All 42 date cells are dead interactions** - Hover effects suggest interactivity but no onClick handlers
2. **Duplicate event displays** - Same posts shown 3 times (calendar dots, upcoming sidebar, full list)
3. **No URL parameter support** - Missing `?date=YYYY-MM-DD` deep linking capability
4. **Event dots not clickable** - Small dots indicate events but can't be clicked directly
5. **Unclear primary action** - "Schedule Post" button navigates away instead of opening inline dialog

---

## Summary

- **Dead interactions:** 42 (all calendar date cells)
- **Duplicate UI elements:** 3 displays per event (calendar dot, upcoming card, full list card)
- **Broken links:** 0 (no navigation errors)
- **Hierarchy issues:** 1 (primary action navigates away from calendar)
- **Design system compliance:** ✅ Excellent (consistent CSS variables)
- **Missing features:** 1 (no URL parameter support for date deep linking)

---

## Findings

### 1. Dead Interactions

#### 1.1 Calendar Date Cells (All 42 Cells)

**Location:** `ContentCalendar.jsx` lines ~180-210

**Issue:** All calendar date cells have hover effects (`onMouseEnter`/`onMouseLeave` changing background color) that suggest interactivity, but **no onClick handlers**. Users expect to click a date to:
- View events scheduled for that date
- Create a new event for that date
- Navigate to a day detail view

**Current Code:**
```javascript
<div
  key={i}
  style={{
    aspectRatio: '1',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    cursor: 'pointer',  // ❌ Suggests clickability but no onClick
    position: 'relative',
    transition: 'all 0.15s',
    background: isTodayCell ? 'var(--accent)' : 'transparent',
    color: isTodayCell ? '#fff' : cell.type !== 'current' ? 'var(--text3)' : 'var(--text)',
    fontWeight: isTodayCell ? 700 : 400,
  }}
  onMouseEnter={e => { if (!isTodayCell) e.currentTarget.style.background = 'var(--surface2)'; }}
  onMouseLeave={e => { if (!isTodayCell) e.currentTarget.style.background = 'transparent'; }}
>
  {cell.day}
  {cell.event && (
    <span style={{
      position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
      width: 4, height: 4, borderRadius: '50%',
      background: isTodayCell ? '#fff' : 'var(--teal)',
    }} />
  )}
</div>
```

**Problems:**
1. `cursor: 'pointer'` suggests clickability
2. Hover effect changes background (interactive affordance)
3. No onClick handler
4. Event dots are visible but not actionable

**Fix Options:**

**Option A: Navigate to Day Detail View**
```javascript
const handleDateClick = (day, month, year) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  navigate(`/calendar?date=${dateStr}`);
};

<div
  onClick={() => cell.type === 'current' && handleDateClick(cell.day, month, year)}
  // ... rest of props
>
```

**Option B: Filter Upcoming List by Date**
```javascript
const handleDateClick = (day, month, year) => {
  const clickedDate = new Date(year, month, day);
  const filtered = posts.filter(p => {
    const postDate = new Date(p.scheduled_at || p.scheduled_time);
    return postDate.toDateString() === clickedDate.toDateString();
  });
  setFilteredPosts(filtered);
  // Scroll to upcoming section
  document.getElementById('upcoming-section')?.scrollIntoView({ behavior: 'smooth' });
};
```

**Option C: Open Event Creation Dialog**
```javascript
const handleDateClick = (day, month, year) => {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  setSelectedDate(dateStr);
  setShowCreateDialog(true);
};
```

**Recommended Fix:** Option A (navigate to day detail) + Option B (filter upcoming list)
- Click date → URL updates to `/calendar?date=YYYY-MM-DD`
- Upcoming sidebar filters to show only that date's events
- Maintains calendar context while showing detail

---

#### 1.2 Event Indicator Dots (Not Independently Clickable)

**Location:** `ContentCalendar.jsx` lines ~200-205

**Issue:** Event indicator dots (small teal circles) are **not independently clickable**. They are positioned absolutely within date cells but don't have their own click handlers. Users may try to click the dot specifically to see event details.

**Current Code:**
```javascript
{cell.event && (
  <span style={{
    position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
    width: 4, height: 4, borderRadius: '50%',
    background: isTodayCell ? '#fff' : 'var(--teal)',
  }} />
)}
```

**Fix:**
- Make entire date cell clickable (see §1.1)
- Or make dot larger (8px) and add separate onClick
- Or show tooltip on hover with event count

**Recommended Fix:** Make entire date cell clickable (covers this case)

---

### 2. Duplicate Event Displays

#### 2.1 Same Events Shown 3 Times

**Locations:**
1. **Calendar Grid** - Event indicator dots (lines ~200-205)
2. **Upcoming Sidebar** - Next 5 events (lines ~220-260)
3. **All Scheduled Posts List** - Full list (lines ~270-320)

**Issue:** Every scheduled post appears in **three different locations**:
- As a small dot on the calendar date
- As a card in the "Upcoming" sidebar (if in next 5)
- As a card in the "All Scheduled Posts" list

**Example:** A post scheduled for Jan 15 appears:
1. As a teal dot on Jan 15 date cell
2. In "Upcoming" sidebar (if within next 5 posts)
3. In "All Scheduled Posts" list at bottom

**User Confusion:**
- "Why is this event shown multiple times?"
- "Are these different events or the same event?"
- "Which one should I click?"

**Current Behavior:**
```javascript
// 1. Calendar dots
const hasEvent = (d, m, y) => scheduledDates.has(`${y}-${m}-${d}`);

// 2. Upcoming sidebar (next 5)
const upcoming = [...posts]
  .filter(p => new Date(p.scheduled_at || p.scheduled_time) >= today)
  .sort((a, b) => new Date(a.scheduled_at || a.scheduled_time) - new Date(b.scheduled_at || b.scheduled_time))
  .slice(0, 5);

// 3. All scheduled posts
{posts.length > 0 && (
  <div style={{ marginTop: 16 }}>
    {/* Full list of all posts */}
  </div>
)}
```

**Analysis:**
- **Calendar dots:** ✅ Keep (provides month overview)
- **Upcoming sidebar:** ✅ Keep (quick access to next 5)
- **All Scheduled Posts list:** ⚠️ **Redundant** - duplicates upcoming sidebar

**Fix Options:**

**Option A: Remove "All Scheduled Posts" Section**
- Keep calendar grid + upcoming sidebar only
- Reduces redundancy
- Loses ability to see all posts at once

**Option B: Make "All Scheduled Posts" Collapsible**
- Default collapsed state
- "Show All Scheduled Posts (15)" button to expand
- Reduces visual clutter while preserving functionality

**Option C: Tabbed Interface**
- Tab 1: "Upcoming (5)"
- Tab 2: "All Posts (15)"
- Only one visible at a time

**Option D: Filter "All Scheduled Posts" to Exclude Upcoming**
- Show "Upcoming (5)" sidebar
- Show "Later (10)" list below (posts beyond next 5)
- Eliminates exact duplication

**Recommended Fix:** Option B (collapsible "All Scheduled Posts")
- Preserves all functionality
- Reduces initial visual clutter
- User can expand if needed
- Clear distinction between "quick view" (upcoming) and "full list" (all)

---

#### 2.2 Event Count Not Displayed

**Location:** Calendar date cells

**Issue:** Date cells with events show a single dot regardless of how many events are scheduled. If 3 posts are scheduled for Jan 15, the cell still shows just one dot.

**Current Code:**
```javascript
{cell.event && (
  <span style={{ /* single dot */ }} />
)}
```

**Fix:** Show event count badge
```javascript
{cell.event && (
  <span style={{
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 8,
    fontWeight: 600,
    color: 'var(--accent)',
    background: 'var(--accent-glow)',
    padding: '1px 4px',
    borderRadius: 8,
  }}>
    {getEventCount(cell.day, month, year)}
  </span>
)}
```

**Benefit:** Users can see at a glance which dates have multiple events

---

### 3. Broken Navigation

**Status:** ✅ No broken links found

**Tested Flows:**
- "Schedule Post" button → `/articles` ✅
- Upcoming event card click → Opens modal ✅
- "View Article" in modal → `/articles` ✅
- Month navigation (prev/next) ✅
- Refresh button ✅

**All navigation works correctly.**

---

### 4. Missing URL Parameter Support

#### 4.1 No Date Deep Linking

**Location:** `ContentCalendar.jsx` (missing implementation)

**Issue:** CalendarView does **not support URL parameters** for date deep linking. Users cannot:
- Navigate to a specific date via URL (e.g., `/calendar?date=2024-01-15`)
- Share a link to a specific date
- Bookmark a specific date
- Navigate from Dashboard to a specific calendar date

**Expected Behavior:**
```
/calendar?date=2024-01-15
→ Calendar displays January 2024
→ Upcoming sidebar filters to Jan 15 events
→ Jan 15 date cell is highlighted
```

**Current Behavior:**
```
/calendar?date=2024-01-15
→ URL parameter is ignored
→ Calendar displays current month
→ No filtering or highlighting
```

**Fix:**
```javascript
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();

// Handle date parameter
useEffect(() => {
  const dateParam = searchParams.get('date');
  if (dateParam) {
    const targetDate = new Date(dateParam);
    if (!isNaN(targetDate.getTime())) {
      setViewDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
      // Optionally filter upcoming to show only that date
      setHighlightedDate(dateParam);
    }
  }
}, [searchParams]);

// Highlight the date cell
const isHighlighted = (d, m, y) => {
  if (!highlightedDate) return false;
  const cellDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return cellDate === highlightedDate;
};
```

**Benefit:** Enables deep linking from Dashboard, external links, and bookmarks

---

#### 4.2 No View Parameter Support

**Issue:** CalendarView does not support `?view=month|week|day` parameter for different calendar views.

**Current State:** Only month view is implemented

**Future Enhancement:** Add week and day views with URL parameter support

---

### 5. Hierarchy Issues

#### 5.1 Primary Action Navigates Away

**Location:** Header "Schedule Post" button (line ~145)

**Issue:** The primary action button "Schedule Post" **navigates away from the calendar** to `/articles`. This breaks the user's mental model:
- User is on Calendar view
- Clicks "Schedule Post"
- Expects to stay on Calendar and create event
- Instead, navigates to Articles view

**Current Code:**
```javascript
<button
  onClick={() => navigate('/articles')}
  style={{ /* accent button styling */ }}
>
  <Plus style={{ width: 12, height: 12 }} /> Schedule Post
</button>
```

**User Expectation:**
- Click "Schedule Post" → Open inline dialog or modal
- Select article from dropdown
- Pick date/time
- Confirm → Event appears on calendar
- Stay on Calendar view

**Fix Options:**

**Option A: Open Inline Scheduling Dialog**
```javascript
const [showScheduleDialog, setShowScheduleDialog] = useState(false);

<button onClick={() => setShowScheduleDialog(true)}>
  <Plus /> Schedule Post
</button>

{showScheduleDialog && (
  <SchedulePostDialog
    onClose={() => setShowScheduleDialog(false)}
    onSchedule={(articleId, date, platform) => {
      // Create schedule via API
      // Refresh calendar
    }}
  />
)}
```

**Option B: Change Button Label**
```javascript
<button onClick={() => navigate('/articles')}>
  <Plus /> Go to Articles
</button>
```

**Option C: Add Secondary Action**
```javascript
<div style={{ display: 'flex', gap: 8 }}>
  <button onClick={() => setShowScheduleDialog(true)} style={{ /* primary */ }}>
    <Plus /> Schedule Post
  </button>
  <button onClick={() => navigate('/articles')} style={{ /* secondary */ }}>
    View Articles
  </button>
</div>
```

**Recommended Fix:** Option A (inline scheduling dialog)
- Keeps user on Calendar view
- Matches user expectation
- Reduces navigation friction
- More efficient workflow

---

#### 5.2 Competing Sections

**Issue:** The view has three competing sections with equal visual weight:
1. Calendar grid (left, 2/3 width)
2. Upcoming sidebar (right, 1/3 width)
3. All Scheduled Posts list (bottom, full width)

**Visual Weight:**
- All three sections use same card styling
- No clear indication of which is primary
- User doesn't know where to look first

**Fix:**
- Make "All Scheduled Posts" collapsible (see §2.1)
- Add visual hierarchy with section headers
- Use different card styles for primary (calendar) vs secondary (lists)

---

### 6. Design System Compliance

**Status:** ✅ Excellent

**Positive Findings:**
- Consistent use of CSS variables (`var(--surface)`, `var(--border)`, `var(--text)`)
- No hardcoded colors or Tailwind classes
- Proper use of design tokens for spacing and typography
- Consistent card styling across all sections
- Good use of color for status indicators (green/red/accent)

**Examples:**
```javascript
style={{ 
  background: 'var(--surface)', 
  border: '1px solid var(--border)', 
  borderRadius: 'var(--radius-lg)',
  color: 'var(--text)',
  fontSize: 12
}}
```

**No issues found in this category.**

---

### 7. Functional Issues

#### 7.1 Modal "View Article" Button Behavior

**Location:** `PostDetailModal` line ~45

**Issue:** The "View Article" button in the post detail modal navigates to `/articles` (generic list) instead of navigating to the specific article.

**Current Code:**
```javascript
<button onClick={onViewArticle} /* ... */>
  View Article
</button>

// In parent component
onViewArticle={() => { 
  setSelectedPost(null); 
  navigate('/articles');  // ❌ Generic list
}}
```

**Expected Behavior:**
```javascript
onViewArticle={() => { 
  setSelectedPost(null); 
  navigate(`/articles?story=${selectedPost.article_id}`);  // ✅ Specific article
}}
```

**Fix:** Use deep linking to navigate to specific article (requires article_id in post object)

---

#### 7.2 Delete Confirmation Uses window.confirm

**Location:** `handleDeleteSchedule` line ~115

**Issue:** Uses native `window.confirm()` instead of custom modal for consistency.

**Current Code:**
```javascript
if (!window.confirm('Remove this scheduled post? The article and its generated content will NOT be deleted.')) return;
```

**Fix:** Use custom confirmation dialog matching app design system

---

#### 7.3 Error Handling Uses alert()

**Location:** `handleDeleteSchedule` lines ~120-125

**Issue:** Uses native `alert()` for error messages instead of toast notifications.

**Current Code:**
```javascript
} else {
  const data = await res.json();
  alert(data.error || 'Failed to delete');  // ❌ Native alert
}
```

**Fix:** Use toast notification system (if available) or custom error modal

---

### 8. Empty State

**Status:** ✅ Good

**Location:** Upcoming sidebar when no posts (lines ~250-255)

**Current Implementation:**
```javascript
<div style={{ ...card, padding: '32px 16px', textAlign: 'center' }}>
  <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
    Queue is empty
  </div>
  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
    Generate content and schedule it to see it here
  </div>
</div>
```

**Positive:**
- Clear message
- Helpful guidance
- Good visual design
- Appropriate emoji

**No issues found.**

---

## Implementation Plan

### Priority 1: Fix Dead Date Cell Interactions (High)

- [ ] **Task 19.1:** Wire calendar date cells to actions
  - Add onClick handler to date cells
  - Implement URL parameter support (`/calendar?date=YYYY-MM-DD`)
  - Filter upcoming sidebar by selected date
  - Highlight selected date cell
  - Update viewDate when date parameter present
  - Test edge cases (invalid dates, missing dates)

### Priority 2: Reduce Duplicate Event Displays (High)

- [ ] **Task 19.2:** Make "All Scheduled Posts" collapsible
  - Add collapsed state (default: collapsed)
  - Add "Show All Scheduled Posts (count)" toggle button
  - Preserve state in localStorage
  - Update visual hierarchy
  - Test expand/collapse behavior

### Priority 3: Fix Primary Action Behavior (Medium)

- [ ] **Task 19.3:** Implement inline scheduling dialog
  - Create SchedulePostDialog component
  - Fetch articles list for dropdown
  - Add date/time picker
  - Add platform selector
  - Wire to `/api/schedule` endpoint
  - Refresh calendar after scheduling
  - Or change button label to "Go to Articles" (simpler fix)

### Priority 4: Improve Event Indicators (Medium)

- [ ] **Task 19.4:** Add event count badges to date cells
  - Calculate event count per date
  - Display count badge instead of single dot
  - Style badge appropriately (small, non-intrusive)
  - Test with multiple events per date

### Priority 5: Fix Modal Navigation (Low)

- [ ] **Task 19.5:** Fix "View Article" button in modal
  - Pass article_id to modal
  - Navigate to `/articles?story={article_id}`
  - Test deep linking to specific article

### Priority 6: Replace Native Dialogs (Low)

- [ ] Replace `window.confirm()` with custom dialog
- [ ] Replace `alert()` with toast notifications
- [ ] Ensure consistent design system usage

---

## Testing Checklist

After implementing fixes:

- [ ] Verify date cells are clickable
- [ ] Verify URL parameter support (`/calendar?date=YYYY-MM-DD`)
- [ ] Verify upcoming sidebar filters by selected date
- [ ] Verify "All Scheduled Posts" is collapsible
- [ ] Verify "Schedule Post" opens inline dialog (or label changed)
- [ ] Verify event count badges display correctly
- [ ] Verify "View Article" navigates to specific article
- [ ] Verify no console errors
- [ ] Test in Docker build: `docker compose up --build`
- [ ] Test browser back/forward navigation
- [ ] Test month navigation (prev/next)
- [ ] Test with 0 posts (empty state)
- [ ] Test with 1 post (no duplicates visible)
- [ ] Test with 20+ posts (performance)

---

## Alignment with Requirements

**Requirement 5.1:** ⚠️ Partially satisfied (42 dead date cell interactions found)  
**Requirement 5.2:** ❌ Not satisfied (date cells not clickable)  
**Requirement 5.3:** ✅ Satisfied (event cards clickable, open modal)  
**Requirement 5.4:** ⚠️ Partially satisfied (3 duplicate displays per event)  
**Requirement 5.5:** ✅ Satisfied (no non-functional buttons, all buttons work)  
**Requirement 9.1:** ✅ Audit complete (dead interactions identified)  
**Requirement 9.2:** ✅ Audit complete (duplicate UI identified)  
**Requirement 9.6:** ✅ Audit complete (findings documented)

---

## Appendix: Component Inventory

### Components

| Component | Purpose | Status |
|-----------|---------|--------|
| CalendarView | Wrapper with error boundary | ✅ Good |
| ContentCalendar | Main calendar component | ⚠️ Needs fixes |
| PostDetailModal | Event detail modal | ⚠️ Minor fixes |

### Interactive Elements

| Element | Location | Functional | Issue |
|---------|----------|------------|-------|
| Date cells (42) | Calendar grid | ❌ No | No onClick handler |
| Event dots | Date cells | ❌ No | Not independently clickable |
| Prev month button | Header | ✅ Yes | Works correctly |
| Next month button | Header | ✅ Yes | Works correctly |
| Refresh button | Header | ✅ Yes | Works correctly |
| Schedule Post button | Header | ⚠️ Partial | Navigates away (unexpected) |
| Upcoming event cards | Sidebar | ✅ Yes | Opens modal |
| All posts cards | Bottom list | ✅ Yes | Opens modal |
| Delete buttons | Post cards | ✅ Yes | Works correctly |
| Modal close button | Modal | ✅ Yes | Works correctly |
| Modal "Remove Schedule" | Modal | ✅ Yes | Works correctly |
| Modal "View Article" | Modal | ⚠️ Partial | Navigates to generic list |

**Summary:**
- **Functional:** 9 elements
- **Partially functional:** 2 elements
- **Non-functional:** 43 elements (42 date cells + event dots)

---

## Recommendations

### Short-term (This Sprint)
1. Wire date cells to onClick handlers (URL parameter support)
2. Make "All Scheduled Posts" collapsible
3. Fix "View Article" button to use deep linking

### Medium-term (Next Sprint)
1. Implement inline scheduling dialog
2. Add event count badges to date cells
3. Replace native dialogs with custom components

### Long-term (Future Enhancement)
1. Add week and day views
2. Add drag-and-drop rescheduling
3. Add calendar export (iCal, Google Calendar)
4. Add recurring event support
5. Add event color coding by platform
6. Add event filtering by platform/status

---

*End of Audit Report*
