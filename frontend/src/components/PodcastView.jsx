import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Mic, RefreshCw, Sparkles, Activity, Calendar, Headphones, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
};

const PodcastView = () => {
  const [latestPodcast, setLatestPodcast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stories, setStories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showSelector, setShowSelector] = useState(false);

  const fetchLatest = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/podcast/latest');
      const data = await res.json();
      if (res.ok) setLatestPodcast(data.podcast);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStories = async () => {
    try {
      const res = await apiFetch('/stories?limit=20&sort=score');
      const data = await res.json();
      if (res.ok) setStories(Array.isArray(data) ? data : (data.stories || []));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchLatest(); fetchStories(); }, []);

  const toggleStory = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const generatePodcast = async () => {
    setGenerating(true);
    try {
      const body = selectedIds.length > 0 ? { article_ids: selectedIds } : { limit: 5 };
      const res = await apiFetch('/generate/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) { await fetchLatest(); setShowSelector(false); }
      else alert(data.error || 'Podcast generation failed');
    } catch { alert('Failed to trigger podcast generation'); }
    finally { setGenerating(false); }
  };

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
          Podcast Studio
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
          AI Synthesis Pipeline V2.0
        </div>
      </div>

      {/* ── Hero Card ── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,168,0.08))', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 }}>

        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              Daily AI <span style={{ color: 'var(--accent)' }}>Pulse</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>
              AI Synthesis Pipeline V2.0
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 14 }}>
          Select articles to include, or use the top 5 by score. Generates a conversational Alex vs Morgan debate script and converts it to audio.
        </div>

        {/* Article Selector */}
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 12, overflow: 'hidden' }}>
          <button
            onClick={() => setShowSelector(s => !s)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text2)', textTransform: 'uppercase' }}>
              {selectedIds.length > 0 ? `${selectedIds.length} article${selectedIds.length > 1 ? 's' : ''} selected` : 'Select Articles (optional — defaults to top 5)'}
            </span>
            {showSelector ? <ChevronUp style={{ width: 14, height: 14, color: 'var(--text3)' }} /> : <ChevronDown style={{ width: 14, height: 14, color: 'var(--text3)' }} />}
          </button>

          {showSelector && (
            <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: '1px solid var(--border)' }} className="custom-scrollbar">
              {stories.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text3)' }}>No stories available — run the pipeline first.</div>
              ) : stories.map(story => {
                const sel = selectedIds.includes(story.id);
                return (
                  <button
                    key={story.id}
                    onClick={() => toggleStory(story.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: sel ? 'var(--accent-glow)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  >
                    {sel
                      ? <CheckSquare style={{ width: 14, height: 14, color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                      : <Square style={{ width: 14, height: 14, color: 'var(--text3)', marginTop: 1, flexShrink: 0 }} />
                    }
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: sel ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{story.source} · Score {story.total_score ?? '—'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={generatePodcast}
          disabled={generating}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 8, border: '1px solid var(--accent)', background: generating ? 'var(--surface2)' : 'var(--accent)', color: generating ? 'var(--text3)' : '#fff', fontSize: 13, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
        >
          {generating ? <RefreshCw style={{ width: 14, height: 14 }} className="animate-spin" /> : <Mic style={{ width: 14, height: 14 }} />}
          {generating ? 'Generating…' : '🎙 Generate Podcast'}
        </button>

        {/* Audio Player */}
        {loading ? (
          <div style={{ marginTop: 14, height: 80, background: 'var(--bg3)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />
        ) : latestPodcast ? (
          <div style={{ marginTop: 14, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--teal)' }}>●</span> Latest — {new Date(latestPodcast.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
              Pulse Digest — {new Date(latestPodcast.created_at).toLocaleDateString()}
            </div>
            <AudioPlayer url={latestPodcast.audio_url} title={`Pulse Digest — ${new Date(latestPodcast.created_at).toLocaleDateString()}`} />
          </div>
        ) : (
          <div style={{ marginTop: 14, textAlign: 'center', padding: '24px 0' }}>
            <Activity style={{ width: 28, height: 28, color: 'var(--text3)', margin: '0 auto 8px' }} />
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>No digest generated yet. Select articles above and click Generate.</div>
          </div>
        )}
      </div>

      {/* ── Episode Archive ── */}
      <div style={card}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
          Episode Archive
        </div>
        {latestPodcast ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', width: 70, flexShrink: 0 }}>
              {new Date(latestPodcast.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', flex: 1 }}>
              Pulse Digest — {new Date(latestPodcast.created_at).toLocaleDateString()}
            </div>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}>
              ▶
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
            No episodes yet
          </div>
        )}
      </div>

    </div>
  );
};

export default PodcastView;
