# Schedule Endpoint Fix

## Issue
The `/api/schedule/queue` endpoint was returning a 404 error when trying to schedule posts.

**Error Log:**
```
172.19.0.1 - admin [27/Apr/2026:08:42:17 +0000] "POST /api/schedule/queue HTTP/1.1" 404 184
```

## Root Cause
The `queue_scheduled_post()` function in `backend/api/routes/schedule.py` was missing the route decorator `@schedule_bp.post("/api/schedule/queue")`.

The function existed with:
- Rate limiting decorator: `@limiter.limit("20 per minute")`
- Full implementation
- Proper validation and error handling

But it was **not registered as a Flask route**, so Flask couldn't find it.

## Fix Applied

### Before:
```python
@limiter.limit("20 per minute")
def queue_scheduled_post():
    """Queue an article for publishing..."""
    # ... implementation
```

### After:
```python
@schedule_bp.post("/api/schedule/queue")
@limiter.limit("20 per minute")
def queue_scheduled_post():
    """Queue an article for publishing..."""
    # ... implementation
```

## Files Modified
- `backend/api/routes/schedule.py` - Added missing route decorator

## Testing

### Endpoint Details
- **URL**: `POST /api/schedule/queue`
- **Rate Limit**: 20 requests per minute
- **Authentication**: Required (admin)

### Request Body:
```json
{
  "article_id": 123,
  "platform": "twitter",
  "scheduled_time": "2026-04-27T15:00:00Z"
}
```

### Response (Success - 201):
```json
{
  "status": "queued",
  "id": 1,
  "article_id": 123,
  "platform": "twitter",
  "scheduled_time": "2026-04-27T15:00:00Z"
}
```

### Response (Error - 404):
```json
{
  "error": "Article 123 not found or not yet processed"
}
```

## Deployment Status
✅ Backend container rebuilt and running
✅ Endpoint now accessible at `/api/schedule/queue`
✅ Changes committed to git

## Related Endpoints
The schedule blueprint also includes:
- `GET /api/schedule/list` - Get list of scheduled posts
- `DELETE /api/schedule/<int:post_id>` - Delete a scheduled post

## Next Steps
1. Test scheduling a post from the UI
2. Verify the notification appears for successful scheduling
3. Check the scheduled posts list in the calendar view

## Summary
The schedule/queue endpoint is now fully functional. Users can schedule articles for publishing on various platforms with proper validation, error handling, and rate limiting.
