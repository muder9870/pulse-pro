import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, Sparkles, Loader2,
  Twitter, Linkedin, FileText, Instagram, Facebook, MessageSquare, Youtube, AtSign,
  CheckCircle2, RotateCcw,
} from 'lucide-react';
import Button from './ui/Button';
import BlogPublisher from './BlogPublisher';

// Decomposed Sub-components
import StoryHeader from './Story/StoryHeader';
import StoryMetrics from './Story/StoryMetrics';
import ContentEditor from './Story/ContentEditor';
import PublishPanel from './Story/PublishPanel';
import MediaPanel from './Story/MediaPanel';
import { QualityModal, TagsModal, EditModal } from './Story/StoryModals';
import Checkbox from './ui/Checkbox';

// ─── Platform definitions ────────────────────────────────────────────────────
const PLATFORM_LIST = [
  { id: 'twitter',   label: 'Twitter',   icon: Twitter,       doneCls: 'bg-sky-500 text-white border-sky-500',       hoverCls: 'hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300' },
  { id: 'linkedin',  label: 'LinkedIn',  icon: Linkedin,      doneCls: 'bg-blue-700 text-white border-blue-700',     hoverCls: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300' },
  { id: 'blog',      label: 'Blog',      icon: FileText,      doneCls: 'bg-emerald-600 text-white border-emerald-600', hoverCls: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300' },
  { id: 'instagram', label: 'Instagram', icon: Instagram,     doneCls: 'bg-pink-500 text-white border-pink-500',     hoverCls: 'hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300' },
  { id: 'facebook',  label: 'Facebook',  icon: Facebook,      doneCls: 'bg-blue-600 text-white border-blue-600',     hoverCls: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' },
  { id: 'reddit',    label: 'Reddit',    icon: MessageSquare, doneCls: 'bg-orange-600 text-white border-orange-600', hoverCls: 'hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300' },
  { id: 'youtube',   label: 'YouTube',   icon: Youtube,       doneCls: 'bg-red-600 text-white border-red-600',       hoverCls: 'hover:bg-red-50 hover:text-red-600 hover:border-red-300' },
  { id: 'threads',   label: 'Threads',   icon: AtSign,        doneCls: 'bg-gray-800 text-white border-gray-800',     hoverCls: 'hover:bg-gray-100 hover:text-gray-800 hover:border-gray-400' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const normalizeHashtag = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value.hashtag === 'string') return value.hashtag;
  return null;
};

// ─── Platform pill sub-component ─────────────────────────────────────────────
// eslint-disable-next-line react/display-name
const PlatformPill = ({ platform, isDone, isGenerating, hasError, onGenerate, onViewContent }) => {
  const { id, label, icon: Icon, doneCls, hoverCls } = platform;

  if (isGenerating) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed select-none">
        <Loader2 className="w-3 h-3 animate-spin" />
        {label}
      </span>
    );
  }

  if (isDone) {
    return (
      <button
        onClick={onViewContent}
        title={`View ${label} content`}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:opacity-80 hover:scale-105 shadow-sm ${doneCls}`}
      >
        <CheckCircle2 className="w-3 h-3" />
        {label}
      </button>
    );
  }

  if (hasError) {
    return (
      <button
        onClick={() => onGenerate(id)}
        title={`Retry — ${hasError}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200"
      >
        <RotateCcw className="w-3 h-3" />
        {label}
      </button>
    );
  }

  // Idle — awaiting user click
  return (
    <button
      onClick={() => onGenerate(id)}
      title={`Generate ${label} post`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:shadow-sm ${hoverCls}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
};

// ─── Main StoryCard ───────────────────────────────────────────────────────────
const StoryCard = React.memo(({
  story,
  initialPlatforms = [],
  isSelected = false,
  onToggleSelection = null,
  hasAnySelection = false
}) => {
  const [platforms, setPlatforms] = useState(
    initialPlatforms.length > 0
      ? initialPlatforms
      : (story.platforms || (story.posts ? story.posts.map(p => p.platform) : []))
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

  // Per-platform generation state
  const [platformGenerating, setPlatformGenerating] = useState({});
  const [platformErrors, setPlatformErrors] = useState({});

  useEffect(() => {
    if (initialPlatforms && initialPlatforms.length > 0) {
      setPlatforms(initialPlatforms);
    }
  }, [initialPlatforms]);

  useEffect(() => {
    if (expanded && platforms.length > 0) {
      platforms.forEach(p => {
        const existingPost = story.posts?.find(post => post.platform === p);
        if (existingPost) {
          setGeneratedContent(prev => ({
            ...prev,
            [p]: { text: existingPost.content, posted: Boolean(existingPost.posted), posted_at: existingPost.posted_at || null }
          }));
        } else {
          fetchContent(p);
        }
        fetchHashtags(p);
      });
    }
  }, [platforms, expanded, story.posts]);

  const tags = Array.isArray(tagsOverride) ? tagsOverride : (Array.isArray(story.tags) ? story.tags : []);
  const hashtags = (Array.isArray(hashtagsOverride) ? hashtagsOverride : (Array.isArray(story.hashtags) ? story.hashtags : []))
    .map(normalizeHashtag)
    .filter(Boolean);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isPlatformDone = (platformId) => {
    const hasPost = story.posts?.some(p => p.platform === platformId);
    const hasGenerated = generatedContent[platformId]?.text && !generatedContent[platformId]?.text.startsWith('Error');
    return Boolean(hasPost || hasGenerated);
  };

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchContent = async (platform) => {
    if (generatedContent[platform]) return;
    try {
      let res = await fetch(`/api/content/${story.id}/${platform}`);
      let data = await res.json();
      if (!data.content) {
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: story.id, platform })
        });
        if (!res.ok) throw new Error('Generation failed');
        await res.json();
        const recRes = await fetch(`/api/content/${story.id}/${platform}`);
        data = await recRes.json();
      }
      setGeneratedContent(prev => ({ ...prev, [platform]: { text: data.content, posted: Boolean(data.posted), posted_at: data.posted_at || null } }));
    } catch (_e) {
      setGeneratedContent(prev => ({ ...prev, [platform]: { text: "Error: Generation failed.", posted: false, posted_at: null } }));
    }
  };

  const fetchMedia = async () => {
    try {
      const res = await fetch(`/api/media/assets/${story.id}`);
      const data = await res.json();
      if (res.ok) setMedia(data.images || []);
    } catch (_e) { /* swallow */ }
  };

  const fetchAudio = async () => {
    try {
      const res = await fetch(`/api/audio/${story.id}`);
      const data = await res.json();
      if (res.ok) setAudioAssets(data.audio || []);
    } catch (_e) { /* swallow */ }
  };

  const fetchHashtags = async (platform) => {
    if (recommendedHashtags[platform]) return;
    try {
      const res = await fetch(`/api/hashtags/${story.id}/${platform}`);
      const data = await res.json();
      if (res.ok) {
        const normalized = (data.hashtags || []).map(normalizeHashtag).filter(Boolean);
        setRecommendedHashtags(prev => ({ ...prev, [platform]: normalized }));
      }
    } catch (_e) { /* swallow */ }
  };

  const fetchQualityCheck = async (platform, content) => {
    if (!content || qualityData[platform]) return;
    setQualityLoading(prev => ({ ...prev, [platform]: true }));
    try {
      const res = await fetch('/api/content/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, platform })
      });
      const data = await res.json();
      if (res.ok) setQualityData(prev => ({ ...prev, [platform]: data }));
    } catch (_e) { /* swallow */ } finally { setQualityLoading(prev => ({ ...prev, [platform]: false })); }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleFeedback = async (platform, isPositive, comment = null, editedContent = null) => {
    try {
      await fetch('/api/personalization/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: story.id, platform, is_positive: isPositive, original_content: generatedContent[platform]?.text, edited_content: editedContent, comment })
      });
    } catch (_e) { /* swallow */ }
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
      setGeneratedContent(prev => ({ ...prev, [platform]: { ...prev[platform], posted: Boolean(data.record.posted), posted_at: data.record.posted_at || null } }));
    } catch (err) { alert(err.message); }
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
      setGeneratedContent(prev => ({ ...prev, [editPlatform]: { ...prev[editPlatform], text: data.record.content || editText } }));
      handleFeedback(editPlatform, true, 'User edit', editText);
      setEditModalOpen(false);
    } catch (err) { setEditError(err.message); } finally { setEditLoading(false); }
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
    } catch (err) { setTagsError(err.message); } finally { setTagsLoading(false); }
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
    } catch (err) { setTagsError(err.message); } finally { setTagsLoading(false); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setTagsOverride(prev => {
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
        body: JSON.stringify({ article_id: story.id, platform, metric_type: type, value: 1.0 })
      });
    } catch (_e) { /* swallow */ }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100 border-green-300';
      case 'B': return 'text-blue-600 bg-blue-100 border-blue-300';
      case 'C': return 'text-orange-600 bg-orange-100 border-orange-300';
      default:  return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  // ── Platform pill: generate for one or more platforms ─────────────────────
  const handleGenerateForPlatform = async (platformOrPlatforms) => {
    const platformsToGenerate = Array.isArray(platformOrPlatforms) 
      ? platformOrPlatforms 
      : [platformOrPlatforms];

    platformsToGenerate.forEach(p => {
      setPlatformGenerating(prev => ({ ...prev, [p]: true }));
      setPlatformErrors(prev => ({ ...prev, [p]: null }));
    });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: story.id, platforms: platformsToGenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      // Refresh content for all requested platforms
      for (const p of platformsToGenerate) {
        const contentRes = await fetch(`/api/content/${story.id}/${p}`);
        const contentData = await contentRes.json();
        if (contentRes.ok && contentData.content) {
          setGeneratedContent(prev => ({
            ...prev,
            [p]: { 
              text: contentData.content, 
              posted: Boolean(contentData.posted), 
              posted_at: contentData.posted_at || null 
            },
          }));
        }
        fetchHashtags(p);
        
        // Ensure generated platform is in the selected list for the hub
        if (!platforms.includes(p)) {
          setPlatforms(prev => [...prev, p]);
        }
      }

      setExpanded(true);
    } catch (err) {
      // Set error for the first platform that failed or generic
      const firstPlatform = platformsToGenerate[0];
      if (firstPlatform) {
        setPlatformErrors(prev => ({ ...prev, [firstPlatform]: err.message }));
      }
    } finally {
      platformsToGenerate.forEach(p => {
        setPlatformGenerating(prev => ({ ...prev, [p]: false }));
      });
    }
  };

  const handleBulkGenerate = () => {
    if (platforms.length === 0) return;
    handleGenerateForPlatform(platforms);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`group relative glass-morphism rounded-[2rem] shadow-lg border transition-all duration-500 overflow-hidden ${
      isSelected ? 'border-indigo-500 ring-4 ring-indigo-100 scale-[1.02] z-10' : 'border-gray-300 hover:border-indigo-500/30 hover:shadow-2xl hover:-translate-y-1'
    }`}>
      {/* Selection Checkbox */}
      {onToggleSelection && (
        <div className={`absolute top-6 left-6 z-20 transition-all duration-300 ${hasAnySelection || isSelected ? 'opacity-100 scale-110' : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'}`}>
          <Checkbox checked={isSelected} onChange={onToggleSelection} className="w-5 h-5 shadow-inner" />
        </div>
      )}

      {/* Visual Accent bar */}
      <div className={`h-1.5 transition-all duration-700 ${isSelected ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full' : 'bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 w-0 group-hover:w-full'}`} />

      <div className="p-8">
        <div className="flex justify-between items-start gap-8">
          <StoryHeader story={story} tags={tags} hashtags={hashtags} />
          <StoryMetrics story={story} />
        </div>

        {/* ── Platform Generation Pills ────────────────────────────────── */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.18em] mb-3">
            Generate for
          </p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_LIST.map((platform) => (
              <PlatformPill
                key={platform.id}
                platform={platform}
                isDone={isPlatformDone(platform.id)}
                isGenerating={!!platformGenerating[platform.id]}
                hasError={platformErrors[platform.id]}
                onGenerate={handleGenerateForPlatform}
                onViewContent={() => {
                  logEngagement('view', platform.id);
                  if (!expanded) { fetchMedia(); fetchAudio(); }
                  setExpanded(true);
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Global Action Bar ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 pt-6 mt-2 border-t border-gray-300">
          <Button
            onClick={() => { if (!expanded) { logEngagement('view'); fetchMedia(); fetchAudio(); } setExpanded(!expanded); }}
            variant="primary"
            size="lg"
            fullWidth
            className="rounded-2xl font-black tracking-tight shadow-blue-100 shadow-xl"
            icon={expanded ? ChevronUp : ChevronDown}
          >
            {expanded ? 'Collapse Insights' : 'Explore Opportunities'}
          </Button>

          <ActionButton icon={Sparkles} onClick={() => setBlogOpen(true)} title="Generate Blog" />
        </div>
      </div>

      <BlogPublisher open={blogOpen} onClose={() => setBlogOpen(false)} articleId={story.id} />

      {expanded && (
        <div className="bg-gray-50/50 border-t border-gray-100 p-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Publishing Hub */}
          <PublishPanel
            platforms={platforms}
            onChange={setPlatforms}
            contentCount={Object.values(generatedContent).filter(c => c && c.text && !c.text.startsWith('Error')).length}
            hasValidContent={platforms.length > 0 && Object.values(generatedContent).filter(c => c && c.text && !c.text.startsWith('Error')).length === platforms.length}
            onSchedule={(p) => {
                  // Open bulk schedule modal with this article pre-selected
                  const event = new CustomEvent('open-schedule-modal', { detail: { articleId: story.id, platform: p } });
                  window.dispatchEvent(event);
                }}
            onPublishNow={() => alert('Publish now coming soon!')}
            onGenerate={handleBulkGenerate}
            isGenerating={Object.values(platformGenerating).some(Boolean)}
          />

          {/* Content Editors */}
          <div className="space-y-4">
            {platforms.map(platform => (
              <ContentEditor
                key={platform}
                platform={platform}
                content={generatedContent[platform]}
                qualityData={qualityData}
                qualityLoading={qualityLoading[platform]}
                hashtags={recommendedHashtags[platform]}
                onTogglePosted={togglePosted}
                onQualityCheck={fetchQualityCheck}
                onEdit={(p) => { setEditPlatform(p); setEditText(generatedContent[p]?.text || ''); setEditModalOpen(true); }}
                onRegenerate={(p) => { setGeneratedContent(prev => ({ ...prev, [p]: null })); fetchContent(p); }}
                onFeedback={handleFeedback}
                onLogEngagement={logEngagement}
                onOpenQualityDetail={(platform, data) => { setActiveQualityDetail({ platform, data }); setQualityModalOpen(true); }}
                getGradeColor={getGradeColor}
              />
            ))}
          </div>

          {/* Media Panel */}
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

      {/* Modals */}
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
        onRemoveTag={(t) => setTagsOverride(prev => prev.filter(x => x !== t))}
        onAutoGenerate={autoGenerateTags}
        onSave={saveTags}
        loading={tagsLoading}
        error={tagsError}
      />
    </div>
  );
});
StoryCard.displayName = 'StoryCard';

// ─── Utility action button ────────────────────────────────────────────────────
const ActionButton = ({ icon: Icon, onClick, title }) => (
  <button
    onClick={onClick}
    className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-gray-500 hover:text-blue-600 transition-all shadow-sm hover:shadow-md"
    title={title}
  >
    <Icon className="w-5 h-5" />
  </button>
);

export default StoryCard;
