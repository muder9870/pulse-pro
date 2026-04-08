# Bulk Operations Integration - User Testing Guide

## Quick Start

### 1. Start the Application
```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Open Browser
Navigate to `http://localhost:5173` (or the port shown in terminal)

---

## How to Test Bulk Operations

### Step 1: Select Articles
1. **Individual Selection**: Hover over any article card and click the checkbox in the top-left corner
2. **Select All**: Click the "Select All" checkbox above the article list
3. **Keyboard Shortcut**: Press `Ctrl+A` (Windows/Linux) or `Cmd+A` (Mac) to select all visible articles

### Step 2: Use Bulk Actions
Once articles are selected, a floating action bar appears at the bottom of the screen with these options:

#### 🎨 Generate Content
- Generates AI content for all selected articles
- Shows progress: "Processing X of Y articles"
- Displays success message when complete
- Shows error details if any articles fail

#### 📅 Schedule
- Opens modal to schedule articles
- Select platform (Twitter, LinkedIn, Facebook, Instagram)
- Choose date and time
- Confirms scheduling for all selected articles

#### 🏷️ Tag
- Opens modal to add tags
- Enter comma-separated tags (e.g., "ai, technology, innovation")
- Tags are added to all selected articles
- Existing tags are preserved

#### 💾 Export
- Exports selected articles to Markdown file
- File downloads automatically
- Filename format: `articles-export-{count}-{date}.md`

#### ✅ Mark Posted
- Marks articles as posted for all platforms with generated content
- Checks each platform automatically
- Shows count of platforms marked

#### 🗑️ Delete
- Opens confirmation modal
- Shows count of articles to delete
- Warns that action is irreversible
- Deletes all selected articles on confirmation

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+A` / `Cmd+A` | Select all visible articles |
| `Escape` | Clear selection |
| `Delete` | Open delete confirmation |

**Note**: Shortcuts only work when:
- You're on the dashboard view
- No modal is currently open

---

## What to Look For

### ✅ Expected Behavior
- Checkboxes appear on hover or when any article is selected
- Selected articles have a blue border and ring
- BulkActionsBar appears at bottom center when articles are selected
- Progress overlay shows during operations
- Success toasts appear after successful operations
- Error component shows details of failed operations

### ⚠️ Edge Cases to Test
1. **Empty Selection**: BulkActionsBar should be hidden
2. **Single Article**: All operations should work with just 1 article
3. **All Articles**: Select All should select everything
4. **Filtered View**: Select All should only select visible filtered articles
5. **View Navigation**: Selection should clear when leaving dashboard
6. **Partial Failures**: Error component should show only failed articles with retry option

### 🐛 Potential Issues to Report
- Checkboxes not appearing or not clickable
- BulkActionsBar not appearing or mispositioned
- Operations not completing or hanging
- Error messages not clear or helpful
- Keyboard shortcuts not working
- Modals not opening or closing properly
- Progress not updating during operations
- Selection not clearing when expected

---

## Testing Checklist

### Basic Functionality
- [ ] Select individual articles
- [ ] Select all articles
- [ ] Clear selection
- [ ] Generate content for selected articles
- [ ] Schedule articles
- [ ] Add tags to articles
- [ ] Export articles
- [ ] Mark articles as posted
- [ ] Delete articles

### Keyboard Shortcuts
- [ ] Ctrl+A / Cmd+A selects all
- [ ] Escape clears selection
- [ ] Delete opens confirmation
- [ ] Shortcuts disabled in modals
- [ ] Shortcuts disabled on other views

### Edge Cases
- [ ] Test with 0 articles selected
- [ ] Test with 1 article selected
- [ ] Test with all articles selected
- [ ] Test with filtered articles
- [ ] Test navigation away from dashboard
- [ ] Test partial operation failures
- [ ] Test retry after failures

### Responsive Design
- [ ] Test on desktop (full screen)
- [ ] Test on tablet (resize browser to ~768px)
- [ ] Test on mobile (resize browser to ~375px)
- [ ] Verify BulkActionsBar positioning
- [ ] Verify modals are usable
- [ ] Verify checkboxes are clickable

---

## Reporting Issues

If you find any issues, please provide:

1. **Steps to Reproduce**: Exact steps that caused the issue
2. **Expected Behavior**: What you expected to happen
3. **Actual Behavior**: What actually happened
4. **Browser Console**: Any error messages in the console (F12 → Console tab)
5. **Network Tab**: Any failed API calls (F12 → Network tab)
6. **Screenshots**: If applicable

---

## Tips for Testing

1. **Use Browser DevTools**: Press F12 to open DevTools and monitor the Console and Network tabs
2. **Test with Real Data**: Make sure you have several articles in the database
3. **Test Different Scenarios**: Try different combinations of selections and operations
4. **Test Error Cases**: Try operations that might fail (e.g., scheduling without backend)
5. **Test Performance**: Try selecting and operating on many articles at once

---

## Known Limitations

- Operations are processed sequentially to avoid overwhelming the API
- Large selections (100+ articles) may take time to process
- Export file size depends on article content length
- Mark as Posted checks all platforms, which may be slow for many articles

---

## Success Criteria

The bulk operations integration is successful if:

✅ All operations complete without errors  
✅ UI is responsive and provides clear feedback  
✅ Keyboard shortcuts work as expected  
✅ Error handling is clear and helpful  
✅ Selection state is managed correctly  
✅ No console errors or warnings  
✅ Works on different screen sizes  

---

**Happy Testing! 🚀**

If you have any questions or need clarification, please ask!
