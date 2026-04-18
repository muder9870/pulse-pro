import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Twitter,
  Linkedin,
  FileText,
  Instagram,
  Facebook,
  MessageSquare,
  Youtube,
  AtSign,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  LayoutList,
} from 'lucide-react';
import BlogPublisher from './BlogPublisher';
import ContentEditor from './Story/ContentEditor';
import PublishPanel from './Story/PublishPanel';
import MediaPanel from './Story/MediaPanel';
import { QualityModal, TagsModal, EditModal } from './Story/StoryModals';
import Checkbox from './ui/Checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  PIPELINE_STATES,
  getStoryState,
  getPrimaryAction,
  mergePostSnapshots,
  getPlatformChannelStatus,
} from '../utils/storyState';

const PLATFORM_LIST = [
  { id: 'twitter', label: 'Twitter', icon: Twitter },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'blog', label: 'Blog', icon: FileText },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'reddit', label: 'Reddit', icon: MessageSquare },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'threads', label: 'Threads', icon: AtSign },
];

const STATE_LABELS = {
  [PIPELINE_STATES.NEEDS_GENERATION]: 'Needs generation',
  [PIPELINE_STATES.GENERATED]: 'Generated',
  [PIPELINE_STATES.NEEDS_REVIEW]: 'Needs review',
  [PIPELINE_STATES.READY]: 'Ready',
  [PIPELINE_STATES.SCHEDULED]: 'Scheduled',
  [PIPELINE_STATES.POSTED]: 'Posted',
};

const normalizeHashtag = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value.hashtag === 'string') return value.hashtag;
  return null;
};

const chipBase =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-150 min-h-[32px]';

function PlatformPill({
  platform,
  channelStatus,
  isGenerating,
  hasError,
  onGenerate,
  onViewContent,
}) {
  const { id, label, icon: Icon } = platform;

  if (isGenerating) {
    return (
      <span
        className={`${chipBase} cursor-not-allowed opacity-80`}
        style={{
          borderColor: 'var(--border2)',
          background: 'var(--surface2)',
          color: 'var(--text3)',
        }}
      >
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        {label}
      </span>
    );
  }

  if (hasError) {
    return (
      <button
        type="button"
        onClick={() => onGenerate(id)}
        title={`Retry — ${hasError}`}
        className={chipBase}
        style={{
          borderColor: 'rgba(239,68,68,0.45)',
          background: 'var(--red-dim)',
          color: 'var(--red)',
        }}
      >
        <RotateCcw className="w-3 h-3 shrink-0" />
        {label}
      </button>
    );
  }

  if (channelStatus === 'published') {
    return (
      <button
        type="button"
        onClick={onViewContent}
        title={`View ${label} content`}
        className={chipBase}
        style={{
          borderColor: 'rgba(16,185,129,0.45)',
          background: 'var(--green-dim)',
          color: 'var(--green)',
        }}
      >
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        {label}
      </button>
    );
  }

  if (channelStatus === 'generated') {
    return (
      <button
        type="button"
        onClick={onViewContent}
        title={`View ${label} content`}
        className={chipBase}
        style={{
          borderColor: 'rgba(0,212,168,0.45)',
          background: 'var(--teal-dim)',
          color: 'var(--teal)',
        }}
      >
        <Icon className="w-3 h-3 shrink-0" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onGenerate(id)}
      title={`Generate ${label} post`}
      className={chipBase}
      style={{
        borderColor: 'var(--border2)',
        background: 'var(--surface2)',
        color: 'var(--text2)',
      }}
    >
      <Icon className="w-3 h-3 shrink-0 opacity-80" />
      {label}
    </button>
  );
}

/**
 * @param {object} props
 * @param {object} props.story
 * @param {object} [props.handlers] — optional overrides for primary workflow actions
 * @param {function} [props.handlers.onGenerate]
 * @param {function} [props.handlers.onReview]
 * @param {function} [props.handlers.onApprove]
 * @param {function} [props.handlers.onSchedule]
 * @param {function} [props.handlers.onViewSchedule]
 * @param {function} [props.handlers.onViewPerformance]
 * @param {function} [props.handlers.onView] — (story, { type }) fallback
 * @param {object} [props.config]
 * @param {string[]} [props.config.initialPlatforms]
 */
const StoryCard = React.memo(
  ({
    story,
    handlers = {},
    config = {},
    initialPlatforms = [],
    isSelected = false,
    onToggleSelection = null,
    hasAnySelection = false,
  }) => {
    const queryClient = useQueryClient();

    const initialPlatformsResolved =
      config.initialPlatforms ?? initialPlatforms;

    const [platforms, setPlatforms] = useState(
      initialPlatformsResolved.length > 0
        ? initialPlatformsResolved
        : story.platforms || (story.posts ? story.posts.map((p) => p.platform) : [])
    );
    const [expanded, setExpanded] = useState(false);
    const [generatedContent, setGeneratedContent] = useState({});
    const [tagsModalOpen, setTagsModalOpen] = useState(false);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [tagsOverride, setTagsOverride] = useState(null);
    const [hashtagsOverride, setHashtagsOverride] = useState(null);
    const [tagsError, setTagsError] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editPlatform, setEditPlatform] = useState(null);
    const [editText, setEditText] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState(null);
    const [recommendedHashtags, setRecommendedHashtags] = useState({});
    const [blogOpen, setBlogOpen] = useState(false);
    const [qualityData, setQualityData] = useState({});
    const [qualityLoading, setQualityLoading] = useState({});
    const [qualityModalOpen, setQualityModalOpen] = useState(false);
    const [activeQualityDetail, setActiveQualityDetail] = useState(null);
    const [media, setMedia] = useState([]);
    const [mediaLoading] = useState(false);
    const [audioAssets, setAudioAssets] = useState([]);
    const [audioLoading] = useState(false);
    const [platformGenerating, setPlatformGenerating] = useState({});
    const [platformErrors, setPlatformErrors] = useState({});

    const mergedPosts = useMemo(
      () => mergePostSnapshots(story, generatedContent),
      [story, generatedContent]
    );

    const pipelineState = useMemo(
      () => getStoryState(story, { generatedContent }),
      [story, generatedContent]
    );

    const primaryMeta = useMemo(() => getPrimaryAction(pipelineState), [pipelineState]);

    useEffect(() => {
      if (initialPlatformsResolved && initialPlatformsResolved.length > 0) {
        setPlatforms(initialPlatformsResolved);
      }
    }, [initialPlatformsResolved]);

    useEffect(() => {
      if (expanded && platforms.length > 0) {
        platforms.forEach((p) => {
          const existingPost = story.posts?.find((post) => post.platform === p);
          if (existingPost) {
            setGeneratedContent((prev) => ({
              ...prev,
              [p]: {
                text: existingPost.content,
                posted: Boolean(existingPost.posted),
                posted_at: existingPost.posted_at || null,
              },
            }));
          } else {
            fetchContent(p);
          }
          fetchHashtags(p);
        });
      }
    }, [platforms, expanded, story.posts]);

    const tags = Array.isArray(tagsOverride)
      ? tagsOverride
      : Array.isArray(story.tags)
        ? story.tags
        : [];
    const hashtags = (
      Array.isArray(hashtagsOverride) ? hashtagsOverride : Array.isArray(story.hashtags) ? story.hashtags : []
    )
      .map(normalizeHashtag)
      .filter(Boolean);

    const isPlatformDone = useCallback(
      (platformId) => {
        const hasPost = story.posts?.some((p) => p.platform === platformId);
        const hasGenerated =
          generatedContent[platformId]?.text &&
          !generatedContent[platformId]?.text.startsWith('Error');
        return Boolean(hasPost || hasGenerated);
      },
      [story.posts, generatedContent]
    );

    const fetchContent = async (platform) => {
      if (generatedContent[platform]) return;
      try {
        let res = await fetch(`/api/content/${story.id}/${platform}`);
        let data = await res.json();
        if (!data.content) {
          res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ article_id: story.id, platform }),
          });
          if (!res.ok) throw new Error('Generation failed');
          await res.json();
          const recRes = await fetch(`/api/content/${story.id}/${platform}`);
          data = await recRes.json();
        }
        setGeneratedContent((prev) => ({
          ...prev,
          [platform]: {
            text: data.content,
            posted: Boolean(data.posted),
            posted_at: data.posted_at || null,
          },
        }));
      } catch (_e) {
        setGeneratedContent((prev) => ({
          ...prev,
          [platform]: { text: 'Error: Generation failed.', posted: false, posted_at: null },
        }));
      }
    };

    const fetchMedia = async () => {
      try {
        const res = await fetch(`/api/media/assets/${story.id}`);
        const data = await res.json();
        if (res.ok) setMedia(data.images || []);
      } catch (_e) {
        /* noop */
      }
    };

    const fetchAudio = async () => {
      try {
        const res = await fetch(`/api/audio/${story.id}`);
        const data = await res.json();
        if (res.ok) setAudioAssets(data.audio || []);
      } catch (_e) {
        /* noop */
      }
    };

    const fetchHashtags = async (platform) => {
      if (recommendedHashtags[platform]) return;
      try {
        const res = await fetch(`/api/hashtags/${story.id}/${platform}`);
        const data = await res.json();
        if (res.ok) {
          const normalized = (data.hashtags || []).map(normalizeHashtag).filter(Boolean);
          setRecommendedHashtags((prev) => ({ ...prev, [platform]: normalized }));
        }
      } catch (_e) {
        /* noop */
      }
    };

    const fetchQualityCheck = async (platform, content) => {
      if (!content || qualityData[platform]) return;
      setQualityLoading((prev) => ({ ...prev, [platform]: true }));
      try {
        const res = await fetch('/api/content/quality-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, platform }),
        });
        const data = await res.json();
        if (res.ok) setQualityData((prev) => ({ ...prev, [platform]: data }));
      } catch (_e) {
        /* noop */
      } finally {
        setQualityLoading((prev) => ({ ...prev, [platform]: false }));
      }
    };

    const handleFeedback = async (platform, isPositive, comment = null, editedContent = null) => {
      try {
        await fetch('/api/personalization/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_id: story.id,
            platform,
            is_positive: isPositive,
            original_content: generatedContent[platform]?.text,
            edited_content: editedContent,
            comment,
          }),
        });
      } catch (_e) {
        /* noop */
      }
    };

    const togglePosted = async (platform) => {
      const current = generatedContent?.[platform];
      if (!current?.text) return;
      try {
        const res = await fetch('/api/content/posted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: story.id, platform, posted: !current.posted }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setGeneratedContent((prev) => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            posted: Boolean(data.record.posted),
            posted_at: data.record.posted_at || null,
          },
        }));
      } catch (err) {
        alert(err.message);
      }
    };

    const saveEditedContent = async () => {
      if (!editPlatform) return;
      setEditLoading(true);
      try {
        const res = await fetch('/api/content/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: story.id, platform: editPlatform, content: editText }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setGeneratedContent((prev) => ({
          ...prev,
          [editPlatform]: { ...prev[editPlatform], text: data.record.content || editText },
        }));
        handleFeedback(editPlatform, true, 'User edit', editText);
        setEditModalOpen(false);
      } catch (err) {
        setEditError(err.message);
      } finally {
        setEditLoading(false);
      }
    };

    const saveTags = async () => {
      setTagsLoading(true);
      try {
        const res = await fetch(`/api/tags/${story.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: Array.isArray(tagsOverride) ? tagsOverride : [] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTagsOverride(data.tags);
        setHashtagsOverride((data.hashtags || []).map(normalizeHashtag).filter(Boolean));
        setTagsModalOpen(false);
      } catch (err) {
        setTagsError(err.message);
      } finally {
        setTagsLoading(false);
      }
    };

    const autoGenerateTags = async () => {
      setTagsLoading(true);
      try {
        const res = await fetch('/api/tags/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: story.id, overwrite: true, max_tags: 6 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTagsOverride(data.tags);
        setHashtagsOverride((data.hashtags || []).map(normalizeHashtag).filter(Boolean));
      } catch (err) {
        setTagsError(err.message);
      } finally {
        setTagsLoading(false);
      }
    };

    const addTag = () => {
      const t = tagInput.trim();
      if (!t) return;
      setTagsOverride((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        return base.includes(t) ? base : [...base, t];
      });
      setTagInput('');
    };

    const logEngagement = async (type, platform = null) => {
      try {
        await fetch('/api/analytics/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: story.id, platform, metric_type: type, value: 1.0 }),
        });
      } catch (_e) {
        /* noop */
      }
    };

    const getGradeColor = (grade) => {
      switch (grade) {
        case 'A':
          return 'text-[var(--green)] bg-[var(--green-dim)] border-[var(--green)]';
        case 'B':
          return 'text-[var(--accent)] bg-[var(--accent-glow)] border-[var(--accent)]';
        case 'C':
          return 'text-[var(--amber)] bg-[var(--amber-dim)] border-[var(--amber)]';
        default:
          return 'text-[var(--text2)] bg-[var(--surface2)] border-[var(--border2)]';
      }
    };

    const handleGenerateForPlatform = async (platformOrPlatforms) => {
      const platformsToGenerate = Array.isArray(platformOrPlatforms)
        ? platformOrPlatforms
        : [platformOrPlatforms];

      platformsToGenerate.forEach((p) => {
        setPlatformGenerating((prev) => ({ ...prev, [p]: true }));
        setPlatformErrors((prev) => ({ ...prev, [p]: null }));
      });

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: story.id, platforms: platformsToGenerate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Generation failed');

        for (const p of platformsToGenerate) {
          const contentRes = await fetch(`/api/content/${story.id}/${p}`);
          const contentData = await contentRes.json();
          if (contentRes.ok && contentData.content) {
            setGeneratedContent((prev) => ({
              ...prev,
              [p]: {
                text: contentData.content,
                posted: Boolean(contentData.posted),
                posted_at: contentData.posted_at || null,
              },
            }));
          }
          fetchHashtags(p);
          if (!platforms.includes(p)) {
            setPlatforms((prev) => [...prev, p]);
          }
        }
        setExpanded(true);
      } catch (err) {
        const firstPlatform = platformsToGenerate[0];
        if (firstPlatform) {
          setPlatformErrors((prev) => ({ ...prev, [firstPlatform]: err.message }));
        }
      } finally {
        platformsToGenerate.forEach((p) => {
          setPlatformGenerating((prev) => ({ ...prev, [p]: false }));
        });
      }
    };

    const handleBulkGenerate = () => {
      if (platforms.length === 0) return;
      handleGenerateForPlatform(platforms);
    };

    const runDefaultGenerate = useCallback(() => {
      const targets =
        platforms.length > 0 ? platforms : PLATFORM_LIST.map((p) => p.id);
      const need = targets.filter((id) => !isPlatformDone(id));
      if (need.length === 0) {
        setExpanded(true);
        return;
      }
      handleGenerateForPlatform(need);
    }, [platforms, isPlatformDone]);

    const openWorkspace = useCallback(() => {
      logEngagement('view');
      fetchMedia();
      fetchAudio();
      setExpanded(true);
    }, []);

    const approveOnServer = useCallback(async () => {
      try {
        await api.patch(`/stories/${story.id}/pipeline`, {
          review_status: 'approved',
          content_approved: true,
          needs_review: false,
          ready_to_schedule: true,
        });
        await queryClient.invalidateQueries({ queryKey: ['stories'] });
      } catch (e) {
        console.error('Pipeline approve failed:', e);
      }
      openWorkspace();
    }, [story.id, queryClient, openWorkspace]);

    const executePrimary = useCallback(() => {
      const { action } = getPrimaryAction(pipelineState);
      const h = handlers;

      switch (action) {
        case 'generate':
          if (h.onGenerate) h.onGenerate(story);
          else runDefaultGenerate();
          return;
        case 'review':
          if (h.onReview) h.onReview(story);
          else openWorkspace();
          return;
        case 'approve':
          if (h.onApprove) h.onApprove(story);
          else void approveOnServer();
          return;
        case 'schedule':
          if (h.onSchedule) h.onSchedule(story);
          else {
            window.dispatchEvent(
              new CustomEvent('open-schedule-modal', { detail: { articleId: story.id } })
            );
          }
          return;
        case 'view_schedule':
          if (h.onViewSchedule) h.onViewSchedule(story);
          else if (h.onView) h.onView(story, { type: 'schedule' });
          else openWorkspace();
          return;
        case 'view_performance':
          if (h.onViewPerformance) h.onViewPerformance(story);
          else if (h.onView) h.onView(story, { type: 'performance' });
          else {
            window.dispatchEvent(
              new CustomEvent('story-view-performance', { detail: { storyId: story.id } })
            );
          }
          return;
        default:
          openWorkspace();
      }
    }, [pipelineState, handlers, story, runDefaultGenerate, openWorkspace, approveOnServer]);

    const timeLabel = story.fetched_at
      ? new Date(story.fetched_at).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

    const scoreVal = Math.round(Number(story.total_score) || 0);

    return (
      <article
        className={`group relative overflow-hidden rounded-[var(--radius-lg)] border transition-all duration-300 ${
          isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)] z-10' : ''
        }`}
        style={{
          background: 'var(--surface)',
          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        }}
      >
        <div
          className={`h-1.5 transition-all duration-500 ${
            isSelected ? 'w-full opacity-100' : 'w-0 group-hover:w-full opacity-90'
          }`}
          style={{
            background: 'linear-gradient(90deg, var(--accent), var(--accent2), #EC4899)',
          }}
        />

        {onToggleSelection && (
          <div
            className={`absolute top-5 left-5 z-20 transition-all duration-300 ${
              hasAnySelection || isSelected
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            <Checkbox checked={isSelected} onChange={onToggleSelection} className="w-5 h-5 shadow-inner" />
          </div>
        )}

        <div className="px-5 pt-5 pb-4 md:px-[18px] md:pt-[18px]">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: 'var(--accent-glow)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(108,99,255,0.25)',
                  }}
                >
                  {(story.source || 'Source').toString().slice(0, 24)}
                </span>
                <span style={{ color: 'var(--text2)', fontSize: 11 }}>{timeLabel}</span>
                {story.priority === 'HIGH' && (
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
                  >
                    High priority
                  </span>
                )}
              </div>

              <h2
                className="line-clamp-2 font-semibold leading-snug"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  color: 'var(--text)',
                }}
              >
                {story.url ? (
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-2 hover:opacity-90"
                    style={{ color: 'inherit' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="min-w-0">{story.title}</span>
                    <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 opacity-60" aria-hidden />
                  </a>
                ) : (
                  story.title
                )}
              </h2>

              <p
                className="line-clamp-2 mt-2"
                style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}
              >
                {story.summary || 'No summary yet.'}
              </p>

              {(tags.length > 0 || hashtags.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.slice(0, 4).map((t) => (
                    <span
                      key={`t-${t}`}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: 'var(--surface2)',
                        color: 'var(--text2)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  {hashtags.slice(0, 2).map((h) => (
                    <span
                      key={`h-${h}`}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.35)' }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <span
                className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: 'var(--amber-dim)',
                  color: 'var(--amber)',
                  border: '1px solid rgba(245,158,11,0.35)',
                }}
              >
                {scoreVal} / 100
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                style={{
                  background:
                    pipelineState === PIPELINE_STATES.POSTED
                      ? 'var(--green-dim)'
                      : pipelineState === PIPELINE_STATES.NEEDS_GENERATION
                        ? 'rgba(239,68,68,0.12)'
                        : 'var(--teal-dim)',
                  color:
                    pipelineState === PIPELINE_STATES.POSTED
                      ? 'var(--green)'
                      : pipelineState === PIPELINE_STATES.NEEDS_GENERATION
                        ? 'var(--red)'
                        : 'var(--teal)',
                  border: '1px solid var(--border)',
                }}
              >
                {STATE_LABELS[pipelineState]}
              </span>
            </div>
          </div>

          <div
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3"
              style={{ color: 'var(--text3)' }}
            >
              Channels
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_LIST.map((platform) => (
                <PlatformPill
                  key={platform.id}
                  platform={platform}
                  channelStatus={getPlatformChannelStatus(platform.id, mergedPosts)}
                  isGenerating={!!platformGenerating[platform.id]}
                  hasError={platformErrors[platform.id]}
                  onGenerate={handleGenerateForPlatform}
                  onViewContent={() => {
                    logEngagement('view', platform.id);
                    if (!expanded) {
                      fetchMedia();
                      fetchAudio();
                    }
                    setExpanded(true);
                  }}
                />
              ))}
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-3 mt-4 pt-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={executePrimary}
              className="inline-flex flex-1 min-w-[200px] items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm font-semibold min-h-[44px] transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(108,99,255,0.35)',
              }}
            >
              {primaryMeta.label}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!expanded) {
                  logEngagement('view');
                  fetchMedia();
                  fetchAudio();
                }
                setExpanded((e) => !e);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                borderColor: 'var(--border2)',
                background: 'var(--surface2)',
                color: 'var(--text2)',
              }}
              title={expanded ? 'Collapse details' : 'Expand details'}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => setBlogOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                borderColor: 'var(--border2)',
                background: 'var(--surface2)',
                color: 'var(--text2)',
              }}
              title="Blog generator"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setTagsModalOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              style={{
                borderColor: 'var(--border2)',
                background: 'var(--surface2)',
                color: 'var(--text2)',
              }}
              title="Tags"
            >
              <LayoutList className="w-5 h-5" />
            </button>
          </div>
        </div>

        <BlogPublisher open={blogOpen} onClose={() => setBlogOpen(false)} articleId={story.id} />

        {expanded && (
          <div
            className="space-y-8 px-5 pb-8 pt-2 md:px-[18px] animate-fade-in"
            style={{
              background: 'var(--bg2)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <PublishPanel
              platforms={platforms}
              onChange={setPlatforms}
              contentCount={
                Object.values(generatedContent).filter((c) => c && c.text && !c.text.startsWith('Error'))
                  .length
              }
              hasValidContent={
                platforms.length > 0 &&
                Object.values(generatedContent).filter((c) => c && c.text && !c.text.startsWith('Error'))
                  .length === platforms.length
              }
              onSchedule={() => {
                window.dispatchEvent(
                  new CustomEvent('open-schedule-modal', {
                    detail: { articleId: story.id },
                  })
                );
              }}
              onPublishNow={() => alert('Publish now coming soon!')}
              onGenerate={handleBulkGenerate}
              isGenerating={Object.values(platformGenerating).some(Boolean)}
            />

            <div className="space-y-4">
              {platforms.map((platform) => (
                <ContentEditor
                  key={platform}
                  platform={platform}
                  content={generatedContent[platform]}
                  qualityData={qualityData}
                  qualityLoading={qualityLoading[platform]}
                  hashtags={recommendedHashtags[platform]}
                  onTogglePosted={togglePosted}
                  onQualityCheck={fetchQualityCheck}
                  onEdit={(p) => {
                    setEditPlatform(p);
                    setEditText(generatedContent[p]?.text || '');
                    setEditModalOpen(true);
                  }}
                  onRegenerate={(p) => {
                    setGeneratedContent((prev) => ({ ...prev, [p]: null }));
                    fetchContent(p);
                  }}
                  onFeedback={handleFeedback}
                  onLogEngagement={logEngagement}
                  onOpenQualityDetail={(plat, data) => {
                    setActiveQualityDetail({ platform: plat, data });
                    setQualityModalOpen(true);
                  }}
                  getGradeColor={getGradeColor}
                />
              ))}
            </div>

            <MediaPanel
              media={media}
              mediaLoading={mediaLoading}
              audioAssets={audioAssets}
              audioLoading={audioLoading}
              onGenerateImage={() => alert('Image generation triggered!')}
              onGenerateQuoteCard={() => alert('Quote card triggered!')}
              onGenerateAudio={() => alert('Audio sequence triggered!')}
              onOpenBlogPublisher={() => setBlogOpen(true)}
            />
          </div>
        )}

        <QualityModal
          open={qualityModalOpen}
          detail={activeQualityDetail}
          onClose={() => setQualityModalOpen(false)}
          getGradeColor={getGradeColor}
        />
        <EditModal
          open={editModalOpen}
          platform={editPlatform}
          text={editText}
          setText={setEditText}
          onSave={saveEditedContent}
          onClose={() => setEditModalOpen(false)}
          loading={editLoading}
          error={editError}
        />
        <TagsModal
          open={tagsModalOpen}
          onClose={() => setTagsModalOpen(false)}
          tags={tags}
          hashtags={hashtags}
          tagInput={tagInput}
          setTagInput={setTagInput}
          onAddTag={addTag}
          onRemoveTag={(t) => setTagsOverride((prev) => prev.filter((x) => x !== t))}
          onAutoGenerate={autoGenerateTags}
          onSave={saveTags}
          loading={tagsLoading}
          error={tagsError}
        />
      </article>
    );
  }
);

StoryCard.displayName = 'StoryCard';

export default StoryCard;
