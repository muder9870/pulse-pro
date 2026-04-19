import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Image as ImageIcon, ExternalLink, RefreshCw, Trash2, Video, FileText, Sparkles, Wand2, Plus } from 'lucide-react';
import { useToastContext } from '../hooks/useToast';

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
};

const btn = (active) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.15s',
  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
  background: active ? 'var(--accent)' : 'transparent',
  color: active ? '#fff' : 'var(--text2)',
});

export default function MediaGallery() {
  const toast = useToastContext();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stories, setStories] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('gallery');

  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/media/assets/all');
      const data = await res.json();
      if (res.ok) setAssets(data.assets || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStories = async () => {
    try {
      const res = await apiFetch('/stories?limit=all');
      const data = await res.json();
      if (res.ok) setStories(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAllAssets(); fetchStories(); }, []);

  const handleGenerateImage = async () => {
    if (!selectedStoryId || !imagePrompt) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch('/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: selectedStoryId, prompt: imagePrompt })
      });
      if (res.ok) {
        toast.success('Image generated successfully!');
        await fetchAllAssets();
        setActiveTab('gallery');
        setImagePrompt('');
      } else { toast.error('Failed to generate image'); }
    } catch (err) { toast.error('Image generation failed: ' + err.message); }
    finally { setIsGenerating(false); }
  };

  const handleGenerateVideoScript = async (platform) => {
    if (!selectedStoryId) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch('/media/generate-video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: selectedStoryId, platform })
      });
      if (res.ok) {
        toast.success(`${platform} script generated!`);
        await fetchAllAssets();
        setActiveTab('gallery');
        setFilter('video_script');
      } else { toast.error(`Failed to generate ${platform} script`); }
    } catch (err) { toast.error('Script generation failed: ' + err.message); }
    finally { setIsGenerating(false); }
  };

  const filteredAssets = filter === 'all' ? assets : assets.filter(a => a.asset_type === filter);

  const sel = {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12,
    fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            Media Manager
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
            Create and manage visual assets & video scripts
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setActiveTab('gallery')} style={btn(activeTab === 'gallery')}>Gallery</button>
          <button onClick={() => setActiveTab('generate')} style={btn(activeTab === 'generate')}>
            <Plus style={{ width: 11, height: 11 }} /> Generate Asset
          </button>
        </div>
      </div>

      {activeTab === 'generate' ? (
        /* ── Generate Panel ── */
        <div style={{ ...card, padding: '20px 24px', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles style={{ width: 14, height: 14, color: 'var(--accent)' }} />
            Create New Media Asset
          </div>

          {/* Story selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Select Article</label>
            <select value={selectedStoryId} onChange={e => setSelectedStoryId(e.target.value)} style={sel}>
              <option value="">-- Choose an article --</option>
              {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* AI Image */}
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImageIcon style={{ width: 13, height: 13, color: 'var(--accent2)' }} /> AI Featured Image
              </div>
              <textarea
                placeholder="Enter image prompt…"
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                style={{ width: '100%', height: 80, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 11, fontFamily: 'var(--font-body)', resize: 'none', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
              />
              <button
                onClick={handleGenerateImage}
                disabled={isGenerating || !selectedStoryId || !imagePrompt}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 6, border: '1px solid var(--accent2)', background: !selectedStoryId || !imagePrompt ? 'var(--surface2)' : 'var(--accent2)', color: !selectedStoryId || !imagePrompt ? 'var(--text3)' : '#fff', fontSize: 11, fontWeight: 500, cursor: !selectedStoryId || !imagePrompt ? 'not-allowed' : 'pointer' }}
              >
                {isGenerating ? <RefreshCw style={{ width: 12, height: 12 }} className="animate-spin" /> : <Wand2 style={{ width: 12, height: 12 }} />}
                Generate Image
              </button>
            </div>

            {/* Video Scripts */}
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Video style={{ width: 13, height: 13, color: 'var(--amber)' }} /> Short-form Script
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 10 }}>Generate 60s viral scripts for social video platforms.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['tiktok', 'reels', 'shorts'].map(platform => (
                  <button
                    key={platform}
                    onClick={() => handleGenerateVideoScript(platform)}
                    disabled={isGenerating || !selectedStoryId}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface2)', color: !selectedStoryId ? 'var(--text3)' : 'var(--text)', fontSize: 11, fontWeight: 500, cursor: !selectedStoryId ? 'not-allowed' : 'pointer', textTransform: 'capitalize' }}
                  >
                    Generate {platform} Script
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Gallery ── */
        <>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
            {[
              { key: 'all',          label: `All Assets (${assets.length})` },
              { key: 'image',        label: 'Images' },
              { key: 'video_script', label: 'Video Scripts' },
            ].map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)} style={btn(filter === t.key)}>{t.label}</button>
            ))}
            <button onClick={fetchAllAssets} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}>
              <RefreshCw style={{ width: 11, height: 11 }} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ height: 180, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />)}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ ...card, padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>🖼</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No assets yet</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 280, margin: '0 auto 16px' }}>
                Generate visual assets or video scripts for your articles. Enable image generation in Settings first.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, maxWidth: 400, margin: '20px auto 0', textAlign: 'left' }}>
                {[
                  { num: '1️⃣', title: 'Enable in Settings', desc: 'Turn on image generation feature flag' },
                  { num: '2️⃣', title: 'Pick an Article', desc: 'Select from your article feed' },
                  { num: '3️⃣', title: 'Generate & Download', desc: 'AI creates matching visuals' },
                ].map(step => (
                  <div key={step.num} style={{ padding: 10, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{step.num}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{step.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{step.desc}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActiveTab('generate')}
                style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                Generate Asset →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {filteredAssets.map(asset => (
                <div
                  key={`${asset.asset_type}-${asset.id}`}
                  style={{ ...card, overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {asset.asset_type === 'image' ? (
                    <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg3)' }}>
                      <img src={asset.image_url} alt={asset.prompt || asset.article_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ aspectRatio: '16/9', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                      <Video style={{ width: 24, height: 24, color: 'var(--accent)' }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{asset.platform} Script</span>
                    </div>
                  )}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 600, textTransform: 'uppercase', background: asset.asset_type === 'image' ? 'rgba(139,92,246,0.15)' : 'var(--accent-glow)', color: asset.asset_type === 'image' ? 'var(--accent2)' : 'var(--accent)' }}>
                        {asset.asset_type === 'image' ? 'AI Image' : asset.platform}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{new Date(asset.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.article_title}</div>
                    {asset.asset_type === 'image' && asset.prompt && (
                      <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>"{asset.prompt}"</div>
                    )}
                    {asset.asset_type === 'video_script' && asset.script_text && (
                      <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{asset.script_text}"</div>
                    )}
                  </div>
                  {/* Hover actions */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    {asset.asset_type === 'image' ? (
                      <a href={asset.image_url} target="_blank" rel="noreferrer" style={{ padding: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', display: 'flex' }}>
                        <ExternalLink style={{ width: 14, height: 14 }} />
                      </a>
                    ) : (
                      <button onClick={() => alert(`Script:\n\n${asset.script_text}`)} style={{ padding: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <FileText style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
