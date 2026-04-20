# BulkConfirmationDialog Manual Test Plan

## Requirements
- Requirements 1.1: Bulk operations affecting >10 items show confirmation dialog
- Requirements 1.5: Dialog is cancellable without side effects and idempotent

## Test Scenarios

### Test 1: Bulk Generate with ≤10 items (No Confirmation)
**Steps:**
1. Navigate to Articles view
2. Select 5 articles
3. Click "Launch All" button
**Expected Result:**
- No confirmation dialog appears
- Bulk generate operation starts immediately
- Progress indicator shows

### Test 2: Bulk Generate with >10 items (Shows Confirmation)
**Steps:**
1. Navigate to Articles view
2. Select 15 articles
3. Click "Launch All" button
**Expected Result:**
- Confirmation dialog appears
- Dialog shows "Generate Content" as operation name
- Dialog shows "15 items" as item count
- Dialog has "Confirm" and "Cancel" buttons

### Test 3: Confirm Bulk Operation
**Steps:**
1. Follow Test 2 steps to show confirmation dialog
2. Click "Confirm" button
**Expected Result:**
- Dialog closes
- Bulk generate operation starts
- Progress indicator shows "Generating Content"
- Articles are processed

### Test 4: Cancel Bulk Operation
**Steps:**
1. Follow Test 2 steps to show confirmation dialog
2. Click "Cancel" button
**Expected Result:**
- Dialog closes
- No bulk operation starts
- No side effects (no articles modified)
- Selection remains unchanged

### Test 5: Cancel by Clicking Backdrop
**Steps:**
1. Follow Test 2 steps to show confirmation dialog
2. Click outside the dialog (on the backdrop)
**Expected Result:**
- Dialog closes
- No bulk operation starts
- No side effects

### Test 6: Bulk Delete with >10 items
**Steps:**
1. Navigate to Articles view
2. Select 15 articles
3. Open bulk actions bar
4. Click "Delete" button
**Expected Result:**
- Confirmation dialog appears
- Dialog shows "Delete Articles" as operation name
- Dialog shows "15 items" as item count

### Test 7: Bulk Schedule with >10 items
**Steps:**
1. Navigate to Articles view
2. Select 12 articles
3. Open bulk actions bar
4. Click "Schedule" button
5. Fill in schedule details
6. Click "Schedule" in the schedule modal
**Expected Result:**
- Confirmation dialog appears after schedule modal
- Dialog shows "Schedule Content" as operation name
- Dialog shows "12 items" as item count

### Test 8: Idempotence Test
**Steps:**
1. Follow Test 2 steps to show confirmation dialog
2. Click "Confirm" button
3. Wait for operation to complete
4. Select same 15 articles again
5. Click "Launch All" button
6. Click "Confirm" button again
**Expected Result:**
- Same confirmation dialog appears both times
- Same operation executes both times
- No errors or unexpected behavior

### Test 9: Dashboard "Launch All" Button
**Steps:**
1. Navigate to Dashboard
2. Ensure there are >10 articles in the feed
3. Click "Launch All X →" button in the header
**Expected Result:**
- Confirmation dialog appears
- Dialog shows correct item count
- Operation proceeds after confirmation

## Visual Verification

### Dialog Appearance
- [ ] Dialog is centered on screen
- [ ] Backdrop has blur effect
- [ ] Dialog has proper border and shadow
- [ ] Warning icon is visible (amber color)
- [ ] Operation details are clearly displayed
- [ ] Buttons are properly styled
- [ ] Dialog is responsive on mobile

### Interaction Feedback
- [ ] Buttons have hover effects
- [ ] Dialog animates in smoothly
- [ ] Clicking backdrop closes dialog
- [ ] Clicking inside dialog doesn't close it
- [ ] Cancel button has secondary styling
- [ ] Confirm button has primary styling (accent color)

## Accessibility

- [ ] Dialog is keyboard accessible (Tab navigation)
- [ ] Escape key closes dialog
- [ ] Focus is trapped within dialog
- [ ] Screen reader announces dialog content
- [ ] Buttons have proper ARIA labels

## Edge Cases

### Test 10: Exactly 10 items
**Steps:**
1. Select exactly 10 articles
2. Click "Launch All"
**Expected Result:**
- No confirmation dialog (threshold is >10)
- Operation starts immediately

### Test 11: Exactly 11 items
**Steps:**
1. Select exactly 11 articles
2. Click "Launch All"
**Expected Result:**
- Confirmation dialog appears (>10 threshold met)

### Test 12: Multiple Confirmations in Sequence
**Steps:**
1. Select 15 articles
2. Click "Launch All"
3. Click "Cancel"
4. Immediately click "Launch All" again
5. Click "Confirm"
**Expected Result:**
- Dialog appears twice
- First cancellation has no side effects
- Second confirmation proceeds normally

## Performance

- [ ] Dialog opens instantly (<100ms)
- [ ] No lag when clicking buttons
- [ ] No memory leaks after multiple open/close cycles
- [ ] Works smoothly with 100+ articles selected

## Browser Compatibility

Test in:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Notes

- The confirmation dialog is separate from the existing delete confirmation modal
- The dialog uses Pulse Pro design tokens for consistent styling
- The threshold of 10 items is hardcoded (can be made configurable later)
- The dialog prevents accidental bulk operations on large datasets
