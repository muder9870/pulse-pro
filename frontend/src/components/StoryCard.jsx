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
  FileCheck,
  Send,
  Star,
  BarChart3,
  Edit3,
  Image as ImageIcon,
  Quote,
  Mic,
  Tags,
  Calendar,
} from 'lucide-react';
import BlogPublisher from './BlogPublisher';
import ContentEditor from './Story/ContentEditor';
import MediaPanel from './Story/MediaPanel';
import { QualityModal, TagsModal, EditModal } from './Story/StoryModals';
import Checkbox from './ui/Checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { api, apiFetch } from '../api/client';
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

// Workflow Section Component
function WorkflowSection({ number, title, description, icon: Icon, color, isExpanded, onToggle, isAvailable, children }) {
  const colorStyles = {
    purple: {
      bg: 'rgba(139, 92, 246, 0.1)',
      border: 'rgba(139, 92, 246, 0.3)',
      text: 'rgb(139, 92, 246)',
      iconBg: 'rgba(139, 92, 246, 0.15)',
    },
    green: {
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)',
      text: 'rgb(16, 185, 129)',
      iconBg: 'rgba(16, 185, 129, 0.15)',
    },
    blue: {
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: 'rgb(59, 130, 246)',
      iconBg: 'rgba(59, 130, 246, 0.15)',
    },
    orange: {
      bg: 'rgba(251, 146, 60, 0.1)',
      border: 'rgba(251, 146, 60, 0.3)',
      text: 'rgb(251, 146, 60)',
      iconBg: 'rgba(251, 146, 60, 0.15)',
    },
  };

  const style = colorStyles[color] || colorStyles.purple;

  if (!isAvailable) {
    return (
      <div
        className="rounded-lg border p-4 opacity-50"
        style={{
          background: 'var(--surface2)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
            style={{
              background: 'var(--surface)',
              color: 'var(--text3)',
            }}
          >
            {number}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text3)' }}>
              {title}
            </h4>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
              {description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border transition-all duration-200"
      style={{
        background: style.bg,
        borderColor: style.border,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0"
          style={{
            background: style.iconBg,
            color: style.text,
          }}
        >
          {number}
        </div>
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
          style={{
            background: style.iconBg,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: style.text }} />
        </div>
        <div className="flex-1 text-left">
          <h4 className="text-sm font-semibold" style={{ color: style.text }}>
            {title}
          </h4>
          <p className="text-xs mt-0.5" style={{ color: style.text, opacity: 0.8 }}>
            {description}
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: style.text }}
        />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
  channelStatus,
  isGenerating,
  hasError,
  onGenerate,
  onViewContent,
}) {
  const { id, label, icon: Icon } = platform;

  const getStatusConfig = () => {
    if (isGenerating) {
      return {
        icon: Loader2,
        iconClass: 'animate-spin',
        bg: 'var(--surface2)',
        border: 'var(--border2)',
        text: 'var(--text3)',
        clickable: false,
      };
    }
    if (hasError) {
      return {
        icon: RotateCcw,
        iconClass: '',
        bg: 'var(--red-dim)',
        border: 'rgba(239,68,68,0.45)',
        text: 'var(--red)',
        clickable: true,
        onClick: () => onGenerate(id),
      };
    }
    if (channelStatus === 'published') {
      return {
        icon: CheckCircle2,
        iconClass: '',
        bg: 'var(--green-dim)',
        border: 'rgba(16,185,129,0.45)',
        text: 'var(--green)',
        clickable: true,
        onClick: onViewContent,
      };
    }
    if (channelStatus === 'generated') {
      return {
        icon: Icon,
        iconClass: '',
        bg: 'var(--teal-dim)',
        border: 'rgba(0,212,168,0.45)',
        text: 'var(--teal)',
        clickable: true,
        onClick: onViewContent,
      };
    }
    return {
      icon: Icon,
      iconClass: 'opacity-60',
      bg: 'var(--surface2)',
      border: 'var(--border2)',
      text: 'var(--text3)',
      clickable: true,
      onClick: () => onGenerate(id),
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  const Component = config.clickable ? 'button' : 'div';

  return (
    <Component
      type={config.clickable ? 'button' : undefined}
      onClick={config.onClick}
      className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-all duration-200 ${
        config.clickable ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'
      }`}
      style={{
        background: config.bg,
        borderColor: config.border,
      }}
      title={label}
    >
      <StatusIcon className={`w-5 h-5 ${config.iconClass}`} style={{ color: config.text }} />
    </Component>
  );
}

// Content Action Button Component (for Quote Card, Image, Podcast, Taxonomy)
function ContentActionButton({ icon: Icon, label, onClick, color = 'var(--accent)' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center w-10 h-10 rounded-lg border transition-all duration-200 hover:scale-110 cursor-pointer"
      style={{
        background: 'var(--surface2)',
        borderColor: 'var(--border)',
      }}
      title={label}
    >
      <Icon className="w-5 h-5" style={{ color }} />
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

    const [platforms, setPlatforms] = useState(() => {
      // Initialize platforms from config, initialPlatforms prop, or story data
      if (initialPlatformsResolved.length > 0) {
        return initialPlatformsResolved;
      }
      if (story.posts && story.posts.length > 0) {
        return story.posts.map((p) => p.platform);
      }
      if (story.platforms && story.platforms.length > 0) {
        return story.platforms;
      }
      return [];
    });
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
    const [attachedMedia, setAttachedMedia] = useState({}); // { platform: mediaId }
    const [workflowSections, setWorkflowSections] = useState({
      summary: true, // Expanded by default
      generate: false,
      review: false,
      analyze: false,
    });

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

    // Auto-load content when Review section is opened
    useEffect(() => {
      if (workflowSections.review && platforms.length > 0) {
        // Load media and audio assets
        fetchMedia();
        fetchAudio();
        
        platforms.forEach((p) => {
          // Check if we already have content loaded
          if (generatedContent[p]) return;
          
          // First check if we have it in story.posts
          const existingPost = story.posts?.find((post) => post.platform === p);
          if (existingPost && existingPost.content) {
            setGeneratedContent((prev) => ({
              ...prev,
              [p]: {
                text: existingPost.content,
                posted: Boolean(existingPost.posted),
                posted_at: existingPost.posted_at || null,
              },
            }));
          }
          
          // Load hashtags if not already loaded
          if (!recommendedHashtags[p]) {
            fetchHashtags(p);
          }
        });
      }
    }, [workflowSections.review, platforms, story.posts, generatedContent, recommendedHashtags]);

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
        let res = await apiFetch(`content/${story.id}/${platform}`);
        let data = await res.json();
        if (!data.content) {
          res = await apiFetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ article_id: story.id, platform }),
          });
          if (!res.ok) throw new Error('Generation failed');
          await res.json();
          const recRes = await apiFetch(`content/${story.id}/${platform}`);
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
        const res = await apiFetch(`media/assets/${story.id}`);
        const data = await res.json();
        console.log('fetchMedia response for article', story.id, ':', data);
        console.log('fetchMedia images array:', data.images);
        if (res.ok && data.images) {
          console.log('Setting media state with', data.images.length, 'images');
          setMedia(data.images);
        } else {
          console.log('No images found or response not ok');
          setMedia([]);
        }
      } catch (_e) {
        console.error('fetchMedia error:', _e);
        setMedia([]);
      }
    };

    const fetchAudio = async () => {
      try {
        const res = await apiFetch(`audio/${story.id}`);
        const data = await res.json();
        console.log('fetchAudio response for article', story.id, ':', data);
        console.log('fetchAudio audio array:', data.audio);
        if (res.ok && data.audio) {
          console.log('Setting audioAssets state with', data.audio.length, 'audio files');
          setAudioAssets(data.audio);
        } else {
          console.log('No audio found or response not ok');
          setAudioAssets([]);
        }
      } catch (_e) {
        console.error('fetchAudio error:', _e);
        setAudioAssets([]);
      }
    };

    const fetchHashtags = async (platform) => {
      if (recommendedHashtags[platform]) return;
      try {
        const res = await apiFetch(`hashtags/${story.id}/${platform}`);
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
        const res = await apiFetch('/content/quality-check', {
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
        await apiFetch('/personalization/feedback', {
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

    const handleAttachMedia = (platform, mediaId) => {
      setAttachedMedia((prev) => ({
        ...prev,
        [platform]: mediaId,
      }));
    };

    const togglePosted = async (platform) => {
      const current = generatedContent?.[platform];
      if (!current?.text) return;
      try {
        const res = await apiFetch('/content/posted', {
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
        const res = await apiFetch('/content/update', {
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
        const res = await apiFetch(`tags/${story.id}`, {
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
        const res = await apiFetch('/tags/generate', {
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
        await apiFetch('/analytics/log', {
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
        const res = await apiFetch('/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: story.id, platforms: platformsToGenerate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Generation failed');

        for (const p of platformsToGenerate) {
          const contentRes = await apiFetch(`content/${story.id}/${p}`);
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

    const toggleWorkflowSection = (section) => {
      setWorkflowSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    // Determine which workflow sections are available based on pipeline state
    const availableSections = useMemo(() => {
      // Check if we have any valid content (not errors)
      const hasValidGeneratedContent = Object.values(generatedContent).some(
        (c) => c && c.text && !c.text.startsWith('Error')
      );
      const hasValidPosts = story.posts && story.posts.length > 0 && story.posts.some(p => p.content);
      const hasAnyContent = hasValidGeneratedContent || hasValidPosts;
      
      const sections = {
        summary: true, // Always available
        generate: true, // Always available - users can generate content anytime
        review: hasAnyContent, // Available if any valid content exists
        analyze: pipelineState === PIPELINE_STATES.POSTED,
      };
      return sections;
    }, [pipelineState, generatedContent, story.posts]);

    return (
      <article
        className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
          isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)] z-10' : ''
        }`}
        style={{
          background: 'var(--surface)',
          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {onToggleSelection && (
          <div
            className={`absolute top-4 left-4 z-20 transition-all duration-300 ${
              hasAnySelection || isSelected
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
            }`}
          >
            <Checkbox checked={isSelected} onChange={onToggleSelection} className="w-5 h-5 shadow-sm" />
          </div>
        )}

        <div className="p-5">
          {/* Header Section - Source, Time, Priority */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold"
              style={{
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
              }}
            >
              {(story.source || 'Source').toString().slice(0, 24)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text3)' }}>
              {timeLabel}
            </span>
            {story.priority === 'HIGH' && (
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
                style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
              >
                High Priority
              </span>
            )}
          </div>

          {/* Workflow Sections */}
          <div className="space-y-3 mb-5">
            {/* 1. Summary Section - Contains Article Title, Score, Status, Summary, Tags */}
            <WorkflowSection
              number={1}
              title="Summary"
              description="Extract key takeaways from any article"
              icon={FileCheck}
              color="purple"
              isExpanded={workflowSections.summary}
              onToggle={() => toggleWorkflowSection('summary')}
              isAvailable={availableSections.summary}
            >
              <div className="space-y-3">
                {/* Article Title with Score and Status */}
                <div className="flex items-start justify-between gap-4">
                  <h2
                    className="line-clamp-2 font-bold leading-tight flex-1"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.125rem',
                      color: 'var(--text)',
                    }}
                  >
                    {story.url ? (
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-2 hover:opacity-80 transition-opacity"
                        style={{ color: 'inherit' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="min-w-0">{story.title}</span>
                        <ExternalLink className="w-4 h-4 shrink-0 mt-1 opacity-50" aria-hidden />
                      </a>
                    ) : (
                      story.title
                    )}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="font-mono text-sm font-bold px-3 py-1.5 rounded-lg"
                      style={{
                        background: 'var(--amber-dim)',
                        color: 'var(--amber)',
                      }}
                    >
                      {scoreVal}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap"
                      style={{
                        background:
                          pipelineState === PIPELINE_STATES.POSTED
                            ? 'var(--green-dim)'
                            : pipelineState === PIPELINE_STATES.NEEDS_GENERATION
                              ? 'var(--red-dim)'
                              : 'var(--teal-dim)',
                        color:
                          pipelineState === PIPELINE_STATES.POSTED
                            ? 'var(--green)'
                            : pipelineState === PIPELINE_STATES.NEEDS_GENERATION
                              ? 'var(--red)'
                              : 'var(--teal)',
                      }}
                    >
                      {STATE_LABELS[pipelineState]}
                    </span>
                  </div>
                </div>

                {/* Summary Text */}
                <p className="text-sm" style={{ color: 'var(--text2)', lineHeight: 1.6 }}>
                  {story.summary || 'No summary available yet.'}
                </p>

                {/* Tags */}
                {(tags.length > 0 || hashtags.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span
                        key={`tag-${t}`}
                        className="text-xs px-2.5 py-1 rounded-md font-medium"
                        style={{
                          background: 'var(--surface2)',
                          color: 'var(--text2)',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                    {hashtags.map((h) => (
                      <span
                        key={`hash-${h}`}
                        className="text-xs px-2.5 py-1 rounded-md font-medium"
                        style={{ 
                          background: 'var(--accent-glow)',
                          color: 'var(--accent)',
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </WorkflowSection>

            {/* 2. Content Generation Section */}
            <WorkflowSection
              number={2}
              title="Content Generation"
              description="Turn summaries into engaging content for any format"
              icon={Edit3}
              color="green"
              isExpanded={workflowSections.generate}
              onToggle={() => toggleWorkflowSection('generate')}
              isAvailable={availableSections.generate}
            >
              <div className="space-y-3">
                {/* Platforms Row */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text2)' }}>
                    Platforms
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_LIST.map((platform) => {
                      const channelStatus = getPlatformChannelStatus(platform.id, mergedPosts);
                      return (
                        <PlatformCard
                          key={platform.id}
                          platform={platform}
                          channelStatus={channelStatus}
                          isGenerating={!!platformGenerating[platform.id]}
                          hasError={platformErrors[platform.id]}
                          onGenerate={handleGenerateForPlatform}
                          onViewContent={() => {
                            logEngagement('view', platform.id);
                            // Add platform to platforms array if not already there
                            if (!platforms.includes(platform.id)) {
                              setPlatforms((prev) => [...prev, platform.id]);
                            }
                            // Load content if not already loaded
                            if (!generatedContent[platform.id]) {
                              const existingPost = story.posts?.find((post) => post.platform === platform.id);
                              if (existingPost && existingPost.content) {
                                setGeneratedContent((prev) => ({
                                  ...prev,
                                  [platform.id]: {
                                    text: existingPost.content,
                                    posted: Boolean(existingPost.posted),
                                    posted_at: existingPost.posted_at || null,
                                  },
                                }));
                              }
                            }
                            if (!expanded) {
                              fetchMedia();
                              fetchAudio();
                            }
                            setExpanded(true);
                            // Open the review section to show the content
                            setWorkflowSections((prev) => ({ ...prev, review: true }));
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Content Actions Row */}
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text2)' }}>
                    Content Assets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ContentActionButton
                      icon={Quote}
                      label="Quote Card"
                      onClick={async () => {
                        try {
                          const res = await apiFetch('/media/generate-quote-card', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              article_id: story.id,
                              text: story.summary || story.title,
                              title: story.title
                            }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert('Quote card generated successfully!');
                            fetchMedia();
                          } else {
                            alert(`Error: ${data.error || 'Quote card generation failed'}`);
                          }
                        } catch (err) {
                          alert(`Error: ${err.message}`);
                        }
                      }}
                      color="rgb(139, 92, 246)"
                    />
                    <ContentActionButton
                      icon={ImageIcon}
                      label="Generate Image"
                      onClick={async () => {
                        try {
                          const res = await apiFetch('/media/generate-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              article_id: story.id,
                              prompt: story.summary || story.title
                            }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert('Image generated successfully!');
                            fetchMedia();
                          } else {
                            alert(`Error: ${data.error || 'Image generation failed'}`);
                          }
                        } catch (err) {
                          alert(`Error: ${err.message}`);
                        }
                      }}
                      color="rgb(59, 130, 246)"
                    />
                    <ContentActionButton
                      icon={Mic}
                      label="Podcast"
                      onClick={async () => {
                        try {
                          const res = await apiFetch('/generate/podcast', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              article_ids: [story.id]
                            }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert('Podcast generated successfully!');
                            fetchAudio();
                          } else {
                            alert(`Error: ${data.error || 'Podcast generation failed'}`);
                          }
                        } catch (err) {
                          alert(`Error: ${err.message}`);
                        }
                      }}
                      color="rgb(236, 72, 153)"
                    />
                    <ContentActionButton
                      icon={Tags}
                      label="Taxonomy Management"
                      onClick={() => setTagsModalOpen(true)}
                      color="rgb(251, 146, 60)"
                    />
                  </div>
                </div>

                {/* Generate All Button */}
                {platforms.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkGenerate}
                    disabled={Object.values(platformGenerating).some(Boolean)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: 'rgb(16, 185, 129)',
                      color: '#fff',
                    }}
                  >
                    {Object.values(platformGenerating).some(Boolean) ? 'Generating...' : 'Generate All Selected'}
                  </button>
                )}
              </div>
            </WorkflowSection>

            {/* 3. Review & Optimize Section */}
            <WorkflowSection
              number={3}
              title="Review & Optimize"
              description="Review, edit and optimize before you publish"
              icon={Star}
              color="orange"
              isExpanded={workflowSections.review}
              onToggle={() => toggleWorkflowSection('review')}
              isAvailable={availableSections.review}
            >
              <div className="space-y-3">
                {platforms.map((platform) => (
                  <ContentEditor
                    key={platform}
                    platform={platform}
                    content={generatedContent[platform]}
                    qualityData={qualityData}
                    qualityLoading={qualityLoading[platform]}
                    hashtags={recommendedHashtags[platform]}
                    media={media}
                    attachedMediaId={attachedMedia[platform]}
                    onAttachMedia={handleAttachMedia}
                    onTogglePosted={togglePosted}
                    onQualityCheck={fetchQualityCheck}
                    onEdit={(p) => {
                      setEditPlatform(p);
                      setEditText(generatedContent[p]?.text || '');
                      setEditModalOpen(true);
                    }}
                    onRegenerate={async (p) => {
                      // Clear existing content
                      setGeneratedContent((prev) => ({ ...prev, [p]: null }));
                      
                      // Force regeneration by calling the API directly with force_regenerate flag
                      try {
                        const res = await apiFetch('/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            article_id: story.id, 
                            platform: p,
                            force_regenerate: true  // Bypass LLM cache
                          }),
                        });
                        if (!res.ok) throw new Error('Generation failed');
                        
                        // Fetch the newly generated content
                        const contentRes = await apiFetch(`content/${story.id}/${p}`);
                        const data = await contentRes.json();
                        
                        setGeneratedContent((prev) => ({
                          ...prev,
                          [p]: {
                            text: data.content,
                            posted: Boolean(data.posted),
                            posted_at: data.posted_at || null,
                          },
                        }));
                        
                        // Refresh hashtags
                        fetchHashtags(p);
                      } catch (err) {
                        setGeneratedContent((prev) => ({
                          ...prev,
                          [p]: { text: 'Error: Regeneration failed.', posted: false, posted_at: null },
                        }));
                      }
                    }}
                    onSchedule={(p) => {
                      window.dispatchEvent(
                        new CustomEvent('open-schedule-modal', {
                          detail: { articleId: story.id, platform: p },
                        })
                      );
                    }}
                    onPostNow={async (p) => {
                      // Note: This currently only marks as posted locally
                      // Actual platform posting would require OAuth integrations
                      try {
                        await togglePosted(p);
                        alert(`Marked as posted for ${p}. Note: Actual platform posting requires integration setup.`);
                      } catch (err) {
                        alert(`Error marking as posted for ${p}: ${err.message}`);
                      }
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
                
                {/* Bulk Actions */}
                {platforms.length > 0 && (
                  <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Blog Publisher Button */}
                      <button
                        type="button"
                        onClick={() => setBlogOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                        style={{
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'rgb(139, 92, 246)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                      >
                        <Sparkles className="w-4 h-4" />
                        Publish Blog
                      </button>
                      
                      {/* Schedule All Button */}
                      <button
                        type="button"
                        onClick={() => {
                          // Get platforms with valid content
                          const validPlatforms = platforms.filter(p => {
                            const content = generatedContent[p];
                            return content && content.text && !content.text.startsWith('Error');
                          });
                          
                          if (validPlatforms.length === 0) {
                            alert('No valid content to schedule. Please generate content first.');
                            return;
                          }
                          
                          window.dispatchEvent(
                            new CustomEvent('open-schedule-modal', {
                              detail: { 
                                articleId: story.id, 
                                platforms: validPlatforms,
                                mode: 'schedule-all'
                              },
                            })
                          );
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: 'rgb(59, 130, 246)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        <Calendar className="w-4 h-4" />
                        {(() => {
                          const count = platforms.filter(p => {
                            const content = generatedContent[p];
                            return content && content.text && !content.text.startsWith('Error');
                          }).length;
                          return `Schedule All (${count})`;
                        })()}
                      </button>
                      
                      {/* Post All Now Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          const validPlatforms = platforms.filter(p => {
                            const content = generatedContent[p];
                            return content && content.text && !content.text.startsWith('Error') && !content.posted;
                          });
                          
                          if (validPlatforms.length === 0) {
                            alert('No content to post. All platforms are either already posted or have no valid content.');
                            return;
                          }
                          
                          const confirmed = window.confirm(
                            `Mark ${validPlatforms.length} platform${validPlatforms.length !== 1 ? 's' : ''} as posted?\n\n` +
                            `Platforms: ${validPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}\n\n` +
                            `Note: This only marks content as posted locally. Actual platform posting requires integration setup.`
                          );
                          
                          if (!confirmed) return;
                          
                          try {
                            let successCount = 0;
                            let errorCount = 0;
                            
                            for (const platform of validPlatforms) {
                              try {
                                await togglePosted(platform);
                                successCount++;
                              } catch (err) {
                                console.error(`Failed to post ${platform}:`, err);
                                errorCount++;
                              }
                            }
                            
                            if (errorCount === 0) {
                              alert(`✅ Successfully marked ${successCount} platform${successCount !== 1 ? 's' : ''} as posted!`);
                            } else {
                              alert(`⚠️ Posted ${successCount} platform${successCount !== 1 ? 's' : ''}, but ${errorCount} failed. Check console for details.`);
                            }
                          } catch (err) {
                            alert(`❌ Error posting: ${err.message}`);
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'rgb(16, 185, 129)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <Send className="w-4 h-4" />
                        {(() => {
                          const count = platforms.filter(p => {
                            const content = generatedContent[p];
                            return content && content.text && !content.text.startsWith('Error') && !content.posted;
                          }).length;
                          return `Post All Now (${count})`;
                        })()}
                      </button>
                    </div>
                  </div>
                )}
                
                <MediaPanel
                  media={media}
                  mediaLoading={mediaLoading}
                  audioAssets={audioAssets}
                  audioLoading={audioLoading}
                />
              </div>
            </WorkflowSection>

            {/* 4. Analyze Section */}
            <WorkflowSection
              number={4}
              title="Analyze"
              description="Track performance and improve your strategy"
              icon={BarChart3}
              color="purple"
              isExpanded={workflowSections.analyze}
              onToggle={() => toggleWorkflowSection('analyze')}
              isAvailable={availableSections.analyze}
            >
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--text2)' }}>
                  Performance analytics will be available here once content is posted.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('story-view-performance', { detail: { storyId: story.id } })
                    );
                  }}
                  className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: 'rgb(139, 92, 246)',
                  }}
                >
                  View Performance Dashboard
                </button>
              </div>
            </WorkflowSection>
          </div>
        </div>

        <BlogPublisher open={blogOpen} onClose={() => setBlogOpen(false)} articleId={story.id} />

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
