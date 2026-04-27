import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Image as ImageIcon, ExternalLink, RefreshCw, Trash2, Video, FileText, Sparkles, Wand2, Plus, Download, ImageOff } from 'lucide-react';
import { useToastContext } from '../hooks/useToast';
import BulkConfirmationDialog from './BulkConfirmationDialog';

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
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedAssets, setSelectedAssets] = useState(new Set());
  const [brokenImages, setBrokenImages] = useState(new Set()); // Track broken images (Requirements 6.5)
  
  // Bulk confirmation dialog state (Requirements 6.3)
  const [bulkConfirmation, setBulkConfirmation] = useState({
    isOpen: false,
    operationName: '',
    itemCount: 0,
    onConfirm: null,
  });

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

  const handleGenerateQuoteCard = async () => {
    if (!selectedStoryId) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch('/media/generate-quote-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: selectedStoryId })
      });
      if (res.ok) {
        toast.success('Quote card generated successfully!');
        await fetchAllAssets();
        setActiveTab('gallery');
      } else { toast.error('Failed to generate quote card'); }
    } catch (err) { toast.error('Quote card generation failed: ' + err.message); }
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

  const filteredAssets = filter === 'all' 
    ? assets 
    : filter === 'quote_card'
    ? assets.filter(a => a.asset_type === 'image' && a.media_type === 'quote-card')
    : filter === 'image'
    ? assets.filter(a => a.asset_type === 'image' && a.media_type !== 'quote-card')
    : assets.filter(a => a.asset_type === filter);

  const handleMediaCardClick = (asset) => {
    setSelectedAsset(asset);
  };

  const closeMediaModal = () => {
    setSelectedAsset(null);
  };

  // Toggle asset selection
  const toggleAssetSelection = (assetId) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedAssets(new Set());
  };

  // Handle image load error (Requirements 6.5)
  const handleImageError = (assetId) => {
    setBrokenImages(prev => new Set(prev).add(assetId));
  };

  // Bulk delete handler with confirmation (Requirements 6.3)
  const handleBulkDelete = () => {
    const assetIds = Array.from(selectedAssets);
    
    // Show confirmation dialog for >10 items
    if (assetIds.length > 10) {
      setBulkConfirmation({
        isOpen: true,
        operationName: 'Delete Media',
        itemCount: assetIds.length,
        onConfirm: () => {
          setBulkConfirmation({ isOpen: false, operationName: '', itemCount: 0, onConfirm: null });
          executeBulkDelete(assetIds);
        },
      });
    } else {
      executeBulkDelete(assetIds);
    }
  };

  // Execute bulk delete
  const executeBulkDelete = async (assetIds) => {
    try {
      // Delete each asset
      for (const assetId of assetIds) {
        await apiFetch(`/media/assets/${assetId}`, { method: 'DELETE' });
      }
      toast.success(`Deleted ${assetIds.length} media asset(s)`);
      clearSelection();
      await fetchAllAssets();
    } catch (err) {
      toast.error('Failed to delete some assets: ' + err.message);
    }
  };

  // Bulk download handler with confirmation (Requirements 6.3)
  const handleBulkDownload = () => {
    const assetIds = Array.from(selectedAssets);
    
    // Show confirmation dialog for >10 items
    if (assetIds.length > 10) {
      setBulkConfirmation({
        isOpen: true,
        operationName: 'Download Media',
        itemCount: assetIds.length,
        onConfirm: () => {
          setBulkConfirmation({ isOpen: false, operationName: '', itemCount: 0, onConfirm: null });
          executeBulkDownload(assetIds);
        },
      });
    } else {
      executeBulkDownload(assetIds);
    }
  };

  // Execute bulk download
  const executeBulkDownload = async (assetIds) => {
    try {
      const selectedAssetsList = assets.filter(a => assetIds.includes(`${a.asset_type}-${a.id}`));
      
      for (const asset of selectedAssetsList) {
        if (asset.asset_type === 'image' && asset.image_url) {
          // Download image
          const link = document.createElement('a');
          link.href = asset.image_url;
          link.download = `${asset.article_title.replace(/[^a-z0-9]/gi, '_')}_${asset.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (asset.asset_type === 'video_script' && asset.script_text) {
          // Download script as text file
          const blob = new Blob([asset.script_text], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${asset.article_title.replace(/[^a-z0-9]/gi, '_')}_${asset.platform}_script.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
      
      toast.success(`Downloaded ${assetIds.length} media asset(s)`);
      clearSelection();
    } catch (err) {
      toast.error('Failed to download some assets: ' + err.message);
    }
  };

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

            {/* Quote Card */}
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles style={{ width: 13, height: 13, color: 'var(--amber)' }} /> Quote Card
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 10 }}>Generate a styled quote card with article text. No API key required.</div>
              <button
                onClick={handleGenerateQuoteCard}
                disabled={isGenerating || !selectedStoryId}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 6, border: '1px solid var(--amber)', background: !selectedStoryId ? 'var(--surface2)' : 'var(--amber)', color: !selectedStoryId ? 'var(--text3)' : '#fff', fontSize: 11, fontWeight: 500, cursor: !selectedStoryId ? 'not-allowed' : 'pointer' }}
              >
                {isGenerating ? <RefreshCw style={{ width: 12, height: 12 }} className="animate-spin" /> : <Sparkles style={{ width: 12, height: 12 }} />}
                Generate Quote Card
              </button>
            </div>

            {/* Video Scripts - REMOVED per user request */}
            {/* TikTok, Reels, Shorts scripts removed */}
          </div>
        </div>
      ) : (
        /* ── Gallery ── */
        <>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
            {[
              { key: 'all',        label: `All Assets (${assets.length})` },
              { key: 'image',      label: 'Images' },
              { key: 'quote_card', label: 'Quote Cards' },
            ].map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)} style={btn(filter === t.key)}>{t.label}</button>
            ))}
            <button onClick={fetchAllAssets} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}>
              <RefreshCw style={{ width: 11, height: 11 }} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Bulk Actions Bar */}
          {selectedAssets.size > 0 && (
            <div style={{ 
              ...card, 
              padding: '12px 16px', 
              marginBottom: 14, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  {selectedAssets.size} selected
                </span>
                <button 
                  onClick={clearSelection}
                  style={{ 
                    fontSize: 11, 
                    color: 'var(--text2)', 
                    background: 'transparent', 
                    border: 'none', 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleBulkDownload}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border2)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <Download style={{ width: 12, height: 12 }} />
                  Download
                </button>
                <button
                  onClick={handleBulkDelete}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--red)',
                    background: 'var(--red)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 style={{ width: 12, height: 12 }} />
                  Delete
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ height: 180, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />)}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ ...card, padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>🖼</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No media assets yet</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 280, margin: '0 auto 16px' }}>
                Generate AI images or quote cards for your articles to use in social media and content marketing.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, maxWidth: 400, margin: '20px auto 0', textAlign: 'left' }}>
                {[
                  { num: '1️⃣', title: 'Select Article', desc: 'Choose from your processed stories' },
                  { num: '2️⃣', title: 'Generate Asset', desc: 'Create AI image or quote card' },
                  { num: '3️⃣', title: 'Download & Share', desc: 'Use in your content marketing' },
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
              {filteredAssets.map(asset => {
                const assetKey = `${asset.asset_type}-${asset.id}`;
                const isSelected = selectedAssets.has(assetKey);
                
                return (
                  <div
                    key={assetKey}
                    style={{ ...card, overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    onClick={() => handleMediaCardClick(asset)}
                  >
                    {/* Selection Checkbox */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: 8, 
                        left: 8, 
                        zIndex: 10,
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: isSelected ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.8)',
                        background: isSelected ? 'var(--accent)' : 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAssetSelection(assetKey);
                      }}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  {asset.asset_type === 'image' ? (
                    <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg3)', position: 'relative' }}>
                      {brokenImages.has(asset.id) ? (
                        // Fallback UI for broken images (Requirements 6.5)
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 8,
                          background: 'var(--surface2)',
                          color: 'var(--text3)'
                        }}>
                          <ImageOff style={{ width: 32, height: 32, opacity: 0.5 }} />
                          <span style={{ fontSize: 10, fontWeight: 500 }}>Image unavailable</span>
                        </div>
                      ) : (
                        <img 
                          src={asset.image_url} 
                          alt={asset.prompt || asset.article_title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={() => handleImageError(asset.id)}
                        />
                      )}
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
                      <a 
                        href={asset.image_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', display: 'flex' }}
                      >
                        <ExternalLink style={{ width: 14, height: 14 }} />
                      </a>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Script:\n\n${asset.script_text}`);
                        }} 
                        style={{ padding: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex' }}
                      >
                        <FileText style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Media Details Modal ── */}
      {selectedAsset && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.75)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000,
            padding: 20
          }}
          onClick={closeMediaModal}
        >
          <div 
            style={{ 
              ...card, 
              maxWidth: 800, 
              width: '100%', 
              maxHeight: '90vh', 
              overflow: 'auto',
              padding: 24
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedAsset.asset_type === 'image' ? (
                  <ImageIcon style={{ width: 18, height: 18, color: 'var(--accent2)' }} />
                ) : (
                  <Video style={{ width: 18, height: 18, color: 'var(--accent)' }} />
                )}
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  {selectedAsset.asset_type === 'image' ? 'Image Details' : 'Video Script Details'}
                </h2>
              </div>
              <button 
                onClick={closeMediaModal}
                style={{ 
                  padding: 8, 
                  background: 'transparent', 
                  border: '1px solid var(--border)', 
                  borderRadius: 6, 
                  color: 'var(--text2)', 
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            {selectedAsset.asset_type === 'image' ? (
              <>
                <div style={{ marginBottom: 16, borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg3)' }}>
                  {brokenImages.has(selectedAsset.id) ? (
                    // Fallback UI for broken images in modal (Requirements 6.5)
                    <div style={{ 
                      width: '100%', 
                      minHeight: 400,
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 12,
                      background: 'var(--surface2)',
                      color: 'var(--text3)'
                    }}>
                      <ImageOff style={{ width: 48, height: 48, opacity: 0.5 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Image unavailable</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 300, textAlign: 'center' }}>
                        The image could not be loaded. It may have been deleted or the URL is invalid.
                      </span>
                    </div>
                  ) : (
                    <img 
                      src={selectedAsset.image_url} 
                      alt={selectedAsset.prompt || selectedAsset.article_title} 
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                      onError={() => handleImageError(selectedAsset.id)}
                    />
                  )}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Article</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{selectedAsset.article_title}</div>
                </div>
                {selectedAsset.prompt && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Prompt</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>"{selectedAsset.prompt}"</div>
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Created</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(selectedAsset.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <a 
                    href={selectedAsset.image_url} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      flex: 1,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 6, 
                      padding: '8px 16px', 
                      borderRadius: 6, 
                      border: '1px solid var(--accent2)', 
                      background: 'var(--accent2)', 
                      color: '#fff', 
                      fontSize: 12, 
                      fontWeight: 500, 
                      textDecoration: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <ExternalLink style={{ width: 14, height: 14 }} />
                    Open Full Size
                  </a>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 16, padding: 16, background: 'var(--accent-glow)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Video style={{ width: 32, height: 32, color: 'var(--accent)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selectedAsset.platform} Script</span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Article</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{selectedAsset.article_title}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Platform</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>{selectedAsset.platform}</div>
                </div>
                {selectedAsset.script_text && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Script</div>
                    <div style={{ 
                      fontSize: 12, 
                      color: 'var(--text)', 
                      background: 'var(--surface2)', 
                      padding: 12, 
                      borderRadius: 6, 
                      border: '1px solid var(--border)',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'var(--font-body)',
                      maxHeight: 300,
                      overflow: 'auto'
                    }}>
                      {selectedAsset.script_text}
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Created</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(selectedAsset.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAsset.script_text);
                      toast.success('Script copied to clipboard!');
                    }}
                    style={{ 
                      flex: 1,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 6, 
                      padding: '8px 16px', 
                      borderRadius: 6, 
                      border: '1px solid var(--accent)', 
                      background: 'var(--accent)', 
                      color: '#fff', 
                      fontSize: 12, 
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    <FileText style={{ width: 14, height: 14 }} />
                    Copy Script
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk Confirmation Dialog (Requirements 6.3) */}
      <BulkConfirmationDialog
        isOpen={bulkConfirmation.isOpen}
        operationName={bulkConfirmation.operationName}
        itemCount={bulkConfirmation.itemCount}
        onConfirm={bulkConfirmation.onConfirm}
        onCancel={() => setBulkConfirmation({ isOpen: false, operationName: '', itemCount: 0, onConfirm: null })}
      />
    </div>
  );
}
