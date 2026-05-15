import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { BookOpen, Search, FlaskConical, ExternalLink, RefreshCw } from 'lucide-react';
import PaperDetailsModal from './PaperDetailsModal';

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
  transition: 'all 0.15s',
  cursor: 'pointer',
};

const CATEGORIES = ['All', 'CS.AI', 'CS.LG', 'CS.CV', 'High Score'];

function ResearchView() {
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deepDiving, setDeepDiving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [savedPapers, setSavedPapers] = useState(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // T11: Use React Query for data fetching instead of manual state management
  const { data: papers = [], isLoading: loading, refetch: fetchPapers } = useQuery({
    queryKey: ['arxiv-papers'],
    queryFn: async () => {
      const res = await apiFetch('/stories?limit=100&source=arxiv&sort=score');
      if (!res.ok) throw new Error('Failed to fetch papers');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const openDeepDive = async (paper) => {
    setSelectedPaper(paper);
    setAnalysis(null);
    setModalOpen(true);
    
    // Update URL with paper parameter
    setSearchParams({ paper: paper.id });
    
    try {
      const res = await apiFetch(`research/analysis/${paper.id}`);
      const data = await res.json();
      if (res.ok && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setDeepDiving(true);
        const diveRes = await apiFetch('/research/deep-dive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: paper.id })
        });
        const diveData = await diveRes.json();
        if (diveRes.ok && diveData.analysis) setAnalysis(diveData.analysis);
        else { alert(diveData.error || 'Deep dive failed'); setModalOpen(false); }
      }
    } catch (err) { alert('Failed to connect to research engine'); setModalOpen(false); }
    finally { setDeepDiving(false); }
  };

  const handleRegenerate = async () => {
    setDeepDiving(true); setAnalysis(null);
    try {
      await apiFetch(`research/analysis/${selectedPaper.id}`, { method: 'DELETE' });
      const diveRes = await apiFetch('/research/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: selectedPaper.id })
      });
      const diveData = await diveRes.json();
      if (diveRes.ok && diveData.analysis) setAnalysis(diveData.analysis);
      else alert(diveData.error || 'Regeneration failed');
    } catch { alert('Failed to regenerate analysis'); }
    finally { setDeepDiving(false); }
  };

  // Handle URL parameter for deep linking to specific paper
  useEffect(() => {
    const paperParam = searchParams.get('paper');
    if (paperParam && papers.length > 0 && !modalOpen) {
      const paperId = parseInt(paperParam, 10);
      const paper = papers.find(p => p.id === paperId);
      if (paper) {
        openDeepDive(paper);
      }
    }
  }, [searchParams, papers]);

  const filtered = papers.filter(p => {
    const matchSearch = !searchQuery || p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || p.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'All' || 
      (activeCategory === 'High Score' ? (p.total_score || 0) >= 50 : 
      (p.category || '').toUpperCase() === activeCategory.toUpperCase());
    const matchSaved = !showSavedOnly || savedPapers.has(p.id);
    return matchSearch && matchCat && matchSaved;
  });

  const getScoreColor = (score) => score >= 50 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--text3)';

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            Research Hub
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
            Deep technical analysis of the latest academic papers
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveCategory('All')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
          >
            Filter ▾
          </button>
          <button
            onClick={() => {
              setShowSavedOnly(!showSavedOnly);
              setActiveCategory('All');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: showSavedOnly ? '1px solid var(--accent)' : '1px solid var(--border2)', background: showSavedOnly ? 'var(--accent-glow)' : 'transparent', color: showSavedOnly ? 'var(--accent)' : 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
          >
            📖 Saved ({savedPapers.size})
          </button>
        </div>
      </div>

      {/* ── Category filter tabs + search ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              border: activeCategory === cat ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: activeCategory === cat ? 'var(--accent)' : 'transparent',
              color: activeCategory === cat ? '#fff' : 'var(--text2)',
            }}
          >
            {cat} {cat === 'All' ? `(${papers.length})` : ''}
          </button>
        ))}

        {/* Search */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', width: 200 }}>
          <Search style={{ width: 12, height: 12, color: 'var(--text3)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search papers…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 11, fontFamily: 'var(--font-body)', width: '100%' }}
          />
        </div>

        <button onClick={fetchPapers} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}>
          <RefreshCw style={{ width: 11, height: 11 }} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Research Cards ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 100, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: '60px 24px', textAlign: 'center', cursor: 'default' }}>
          <BookOpen style={{ width: 40, height: 40, color: 'var(--text3)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No research papers found</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Try running the pipeline or adding more arXiv feeds.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(paper => {
            const score = paper.total_score || paper.tech_score || 0;
            const scoreColor = getScoreColor(score);
            return (
              <div
                key={paper.id}
                style={{ ...card }}
                onClick={() => openDeepDive(paper)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
              >
                {/* Top row: category badge + date + score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                    {paper.category || 'CS.AI'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {paper.fetched_at ? new Date(paper.fetched_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', color: scoreColor }}>
                    ▲ Score: {score}
                  </span>
                </div>

                {/* Title */}
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>
                  {paper.title}
                </div>

                {/* Summary */}
                <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {paper.summary}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDeepDive(paper); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                  >
                    <FlaskConical style={{ width: 11, height: 11 }} /> Deep Dive →
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      apiFetch('/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ article_id: paper.id, from_research: true })
                      }).then(r => r.json()).then(d => {
                        if (d.id) alert('Content generated! Check Articles view.');
                        else alert(d.error || 'Generation failed');
                      }).catch(() => alert('Failed to generate content'));
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                  >
                    Generate Post
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (savedPapers.has(paper.id)) {
                        setSavedPapers(new Set([...savedPapers].filter(id => id !== paper.id)));
                      } else {
                        setSavedPapers(new Set([...savedPapers, paper.id]));
                      }
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: 'none', background: savedPapers.has(paper.id) ? 'rgba(255,183,77,0.1)' : 'transparent', color: savedPapers.has(paper.id) ? 'var(--amber)' : 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                  >
                    📖 {savedPapers.has(paper.id) ? 'Saved' : 'Save'}
                  </button>
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}
                    >
                      <ExternalLink style={{ width: 11, height: 11 }} /> arXiv
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaperDetailsModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          // Clear paper parameter from URL when modal closes
          setSearchParams({});
        }}
        analysis={analysis}
        story={selectedPaper}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
}

export default ResearchView;
