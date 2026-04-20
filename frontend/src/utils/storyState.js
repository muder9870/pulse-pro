/**
 * Pipeline state machine for story / article cards.
 * Derives a single active state from API story data plus optional client-side content cache.
 */

export const PIPELINE_STATES = {
  NEEDS_GENERATION: 'NEEDS_GENERATION',
  GENERATED: 'GENERATED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  READY: 'READY',
  SCHEDULED: 'SCHEDULED',
  POSTED: 'POSTED',
};

const hasText = (s) => typeof s === 'string' && s.trim().length > 0;

/**
 * Merge server `story.posts` with local `generatedContent` from the card (not yet refetched).
 */
export function mergePostSnapshots(story, generatedContent = {}) {
  const map = new Map();
  for (const p of story.posts || []) {
    if (!p?.platform) continue;
    map.set(p.platform, {
      platform: p.platform,
      content: p.content,
      posted: Boolean(p.posted),
      posted_at: p.posted_at ?? null,
    });
  }
  for (const [platform, gc] of Object.entries(generatedContent)) {
    if (!gc?.text || String(gc.text).startsWith('Error')) continue;
    const prev = map.get(platform);
    map.set(platform, {
      platform,
      content: gc.text,
      posted: gc.posted != null ? Boolean(gc.posted) : prev?.posted ?? false,
      posted_at: gc.posted_at ?? prev?.posted_at ?? null,
    });
  }
  return [...map.values()];
}

/**
 * @param {object} story - API story
 * @param {object} [ctx]
 * @param {Record<string, { text?: string, posted?: boolean, posted_at?: string|null }>} [ctx.generatedContent]
 * @returns {keyof typeof PIPELINE_STATES}
 */
export function getStoryState(story = {}, ctx = {}) {
  const merged = mergePostSnapshots(story, ctx.generatedContent);
  const withContent = merged.filter((p) => hasText(p.content));

  if (withContent.length > 0 && withContent.every((p) => p.posted)) {
    return PIPELINE_STATES.POSTED;
  }

  const scheduledAt =
    story.scheduled_at ?? story.next_scheduled_at ?? story.scheduled_time ?? story.scheduledAt;
  if (scheduledAt && withContent.some((p) => !p.posted)) {
    return PIPELINE_STATES.SCHEDULED;
  }

  if (withContent.length === 0) {
    return PIPELINE_STATES.NEEDS_GENERATION;
  }

  if (story.review_status === 'pending' || story.needs_review === true) {
    return PIPELINE_STATES.NEEDS_REVIEW;
  }

  if (story.content_approved === true || story.ready_to_schedule === true || story.review_status === 'approved') {
    return PIPELINE_STATES.READY;
  }

  return PIPELINE_STATES.GENERATED;
}

/**
 * @param {keyof typeof PIPELINE_STATES} state
 * @returns {{ label: string, action: 'generate' | 'review' | 'approve' | 'schedule' | 'view_schedule' | 'view_performance' }}
 */
export function getPrimaryAction(state) {
  switch (state) {
    case PIPELINE_STATES.NEEDS_GENERATION:
      return { label: 'Generate Content', action: 'generate' };
    case PIPELINE_STATES.GENERATED:
      return { label: 'Review & Edit', action: 'review' };
    case PIPELINE_STATES.NEEDS_REVIEW:
      return { label: 'Approve Content', action: 'approve' };
    case PIPELINE_STATES.READY:
      return { label: 'Schedule Post', action: 'schedule' };
    case PIPELINE_STATES.SCHEDULED:
      return { label: 'View Schedule', action: 'view_schedule' };
    case PIPELINE_STATES.POSTED:
      return { label: 'View Performance', action: 'view_performance' };
    default:
      return { label: 'Review & Edit', action: 'review' };
  }
}

/**
 * Per-platform chip: inactive | generated | published
 */
export function getPlatformChannelStatus(platformId, mergedPosts) {
  const post = mergedPosts.find((p) => p.platform === platformId);
  if (!post || !hasText(post.content)) return 'inactive';
  if (post.posted) return 'published';
  return 'generated';
}
