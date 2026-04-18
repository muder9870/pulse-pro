# API Contract Documentation

## Story Object

### GET /api/stories (Main List)
Returns: Array of Story objects (COMPACT)

```json
{
  "id": 123,
  "title": "Article Title",
  "summary": "Short summary...",
  "source": "arxiv",
  "score": 8.5,
  "published_at": "2026-04-08T10:00:00Z"
}
```

**Note:** Does NOT include quality or content data.

**Pipeline fields (each story):** `review_status` (`none` \| `pending` \| `approved`), `content_approved` (bool), `needs_review` (bool), `ready_to_schedule` (bool), `scheduled_at` (ISO string or omitted). See `PATCH /api/stories/{id}/pipeline` to update flags (body may include any subset of `review_status`, `content_approved`, `needs_review`, `ready_to_schedule`).

**To get complete story:**
1. Fetch story from this list
2. Call `GET /api/content/{id}/{platform}` for platform-specific content
3. Call `GET /api/quality/{id}/{platform}` for quality scores (optional)

### GET /api/stories/{id}/complete (Full Data)
Returns: Story object with ALL fields

```json
{
  "id": 123,
  "title": "Article Title",
  "summary": "Short summary...",
  "quality": {
    "readability": 7.2,
    "originality": 8.1
  },
  "content": {
    "twitter": "Generated tweet...",
    "linkedin": "Generated post..."
  }
}
```

## Frontend TypeScript Types

**Add to `frontend/src/types.ts`:**

```typescript
export interface Story {
  id: number;
  title: string;
  summary: string;
  score: number;
  source: string;
  published_at: string;
}

export interface StoryComplete extends Story {
  quality: {
    readability: number;
    originality: number;
  };
  content: {
    twitter?: string;
    linkedin?: string;
    blog?: string;
  };
}
```

### GET /api/content/{article_id}/{platform}
Returns: Content for one article + platform

```json
{
  "content": "Generated text...",
  "posted": false,
  "posted_at": null
}
```

Returns: `404` if no content exists for this article+platform.

### GET /api/hashtags/{article_id}/{platform}
Returns: Hashtag recommendations

```json
{
  "article_id": 123,
  "platform": "twitter",
  "hashtags": [
    {"hashtag": "#AI", "final_score": 0.94},
    {"hashtag": "#ML", "final_score": 0.87}
  ]
}
```

## Frontend Implications

1. Story list is lightweight (for scrolling, pagination)
2. Full expansion requires 2-3 additional calls
3. Cache aggressively:
   - Story list: 5 minutes
   - Content: 24 hours (doesn't change)
   - Quality: 1 hour (might update)

4. Expect 404 on content fetch → auto-generate is optional
