import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonStats } from './ui/Skeleton';
import FeatureErrorBoundary from './FeatureErrorBoundary';

const DashboardStats = React.memo(({ activeTheme }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalArticles: 0,
    processedArticles: 0,
    generatedContent: 0,
    avgQualityScore: 0,
    deepDiveAnalyzed: 0,
    loading: true,
    loadError: null
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats/dashboard');
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      setStats({
        totalArticles: data.total_articles || 0,
        processedArticles: data.processed_articles || 0,
        generatedContent: data.generated_content || 0,
        avgQualityScore: data.avg_priority_score || 0,
        deepDiveAnalyzed: data.deep_dive_analyzed || 0,
        loading: false,
        loadError: null
      });
    } catch (err) {
      console.error('Failed to fetch stats', err);
      setStats(prev => ({
        ...prev,
        loading: false,
        loadError: `Could not load stats: ${err.message}`,
        totalArticles: 0,
        processedArticles: 0,
        generatedContent: 0,
        avgQualityScore: 0,
        deepDiveAnalyzed: 0
      }));
    }
  };

  const fetchStatsIndividually = async () => {
    try {
      const storiesRes = await fetch('/api/stories?limit=all');
      if (!storiesRes.ok) {
        throw new Error(`Failed to fetch stories: ${storiesRes.status}`);
      }
      const stories = await storiesRes.json();

      const totalArticles = Array.isArray(stories) ? stories.length : 0;
      const processedArticles = Array.isArray(stories)
        ? stories.filter(s => s.summary).length
        : 0;
      const deepDiveAnalyzed = Array.isArray(stories)
        ? stories.filter(s => s.has_deep_analysis).length
        : 0;
      // Count actual generated content instead of multiplying
      const generatedContent = Array.isArray(stories)
        ? stories.filter(s => s.posts && s.posts.length > 0).length
        : 0;

      setStats({
        totalArticles,
        processedArticles,
        generatedContent,
        avgQualityScore: 0,
        deepDiveAnalyzed,
        loading: false,
        loadError: null
      });
    } catch (err) {
      console.error('Failed to fetch individual stats', err);
      setStats(prev => ({ 
        ...prev, 
        loading: false,
        loadError: `Could not load stats: ${err.message}`
      }));
    }
  };

  if (stats.loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 48 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 110, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (stats.loadError) {
    return (
      <div style={{ marginBottom: 48, padding: 24, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--red)' }}>
          <AlertTriangle style={{ width: 20, height: 20 }} />
          <span style={{ fontWeight: 500 }}>{stats.loadError}</span>
        </div>
        <button onClick={fetchStats} style={{ marginTop: 12, fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Try again
        </button>
      </div>
    );
  }

  const items = [
    { label: 'Intelligence Base', value: stats.totalArticles, icon: FileText, color: 'indigo', status: 'Active', filter: 'all' },
    { label: 'AI Analyzed', value: stats.processedArticles, icon: Sparkles, color: 'purple', status: `${Math.round((stats.processedArticles / stats.totalArticles) * 100 || 0)}%`, filter: 'analyzed' },
    { label: 'Posts Generated', value: stats.generatedContent, icon: CheckCircle, color: 'emerald', status: 'Ready', filter: 'hasContent' },
    { label: 'Deep Dive Explorer', value: stats.deepDiveAnalyzed, icon: TrendingUp, color: 'orange', status: 'Actionable', filter: 'deepDive' }
  ];

  const handleCardClick = (item) => {
    window.dispatchEvent(new CustomEvent('dashboard-filter', { 
      detail: { filter: item.filter } 
    }));
    navigate('/articles');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 48 }} className="animate-fade-in">
      {items.map((item, idx) => (
        <div
          key={idx}
          onClick={() => handleCardClick(item)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <item.icon style={{ width: 20, height: 20, color: 'var(--text2)' }} />
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--text2)' }}>
              {item.status}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1, marginBottom: 4 }}>
            {item.value}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
});

const DashboardStatsWrapped = (props) => (
  <FeatureErrorBoundary name="DashboardStats">
    <DashboardStats {...props} />
  </FeatureErrorBoundary>
);

export default DashboardStatsWrapped;
