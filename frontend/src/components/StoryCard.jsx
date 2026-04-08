import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
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
const normalizeHashtag = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value.hashtag === 'string') return value.hashtag;
  return null;
};

const StoryCard = React.memo(({ 
  story, 
  initialPlatforms = [],
  isSelected = false,
  onToggleSelection = null,
  hasAnySelection = false
}) => {
  const [platforms, setPlatforms] = useState(initialPlatforms.length > 0 ? initialPlatforms : (story.platforms || (story.posts ? story.posts.map(p => p.platform) : [])));
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const [mediaLoading, setMediaLoading] = useState(false);
  const [audioAssets, setAudioAssets] = useState([]);
  const [audioLoading, setAudioLoading] = useState(false);

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

  // Frontend note: StoryCard must fetch complete data separately
  // See backend/API_SCHEMA.md for details
  // Example implementation pattern:
  // const fetchCompleteStory = async (storyId) => {
  //     const [story, content, quality] = await Promise.all([
  //         fetch(`/api/stories/${storyId}`),
  //         fetch(`/api/content/${storyId}/twitter`),
  //         fetch(`/api/quality/${storyId}/twitter`)
  //     ]);
  //     // ... combine results
  // };

  // --- Logic remain unchanged to ensure stability ---
  const fetchContent = async (platform) => {
    if (generatedContent[platform]) return;
    setLoading(true);
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
    } catch (_) {
      setGeneratedContent(prev => ({ ...prev, [platform]: { text: "Error: Generation failed.", posted: false, posted_at: null } }));
    } finally { setLoading(false); }
  };

  const fetchMedia = async () => {
    try {
      const res = await fetch(`/api/media/assets/${story.id}`);
      const data = await res.json();
      if (res.ok) setMedia(data.images || []);
    } catch (_) {}
  };

  const fetchAudio = async () => {
    try {
      const res = await fetch(`/api/audio/${story.id}`);
      const data = await res.json();
      if (res.ok) setAudioAssets(data.audio || []);
    } catch (_) {}
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
    } catch (_) {}
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
    } catch (_) {} finally { setQualityLoading(prev => ({ ...prev, [platform]: false })); }
  };

  const handleFeedback = async (platform, isPositive, comment = null, editedContent = null) => {
    try {
      await fetch('/api/personalization/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: story.id, platform, is_positive: isPositive, original_content: generatedContent[platform]?.text, edited_content: editedContent, comment })
      });
    } catch (_) {}
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
    } catch (_) {}
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50/50 border-green-200';
      case 'B': return 'text-blue-600 bg-blue-50/50 border-blue-200';
      case 'C': return 'text-orange-600 bg-orange-50/50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50/50 border-gray-200';
    }
  };

  return (
    <div className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border transition-all duration-500 overflow-hidden ${
      isSelected ? 'border-indigo-500 ring-4 ring-indigo-100 scale-[1.02] z-10' : 'border-gray-100 hover:border-blue-200 hover:shadow-2xl hover:-translate-y-1'
    }`}>
      {/* Selection Checkbox */}
      {onToggleSelection && (
        <div className={`absolute top-6 left-6 z-20 transition-all duration-300 ${hasAnySelection || isSelected ? 'opacity-100 scale-110' : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'}`}>
          <Checkbox checked={isSelected} onChange={onToggleSelection} className="w-5 h-5 shadow-inner" />
        </div>
      )}
      
      {/* Visual Accent */}
      <div className={`h-1.5 transition-all duration-700 ${isSelected ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full' : 'bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 w-0 group-hover:w-full'}`} />

      <div className="p-8">
        <div className="flex justify-between items-start gap-8">
          <StoryHeader story={story} tags={tags} hashtags={hashtags} />
          <StoryMetrics story={story} />
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-4 pt-6 mt-2 border-t border-gray-100/50">
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
            contentCount={Object.values(generatedContent).filter(c => c.text && !c.text.startsWith('Error')).length}
            hasValidContent={platforms.length > 0 && Object.values(generatedContent).filter(c => c.text && !c.text.startsWith('Error')).length === platforms.length}
            onSchedule={(p) => alert(`Scheduling for ${p} coming soon!`)}
            onPublishNow={() => alert('Publish now coming soon!')}
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
