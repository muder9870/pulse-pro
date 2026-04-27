import React from 'react';
import {
  Zap,
  BarChart3, Calendar, BookOpen,
  Mic, Search, Settings,
} from 'lucide-react';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import PipelineStatus from '../components/PipelineStatus';
import { useNavigate } from 'react-router-dom';
import { useStories as useStoriesContext } from '../context/StoriesContext';
import { apiFetch } from '../api/client';

/* ─── Pulse Pro token helpers ─────────────────────────────────────── */
const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
};

const SectionLabel = ({ children, sub }) => (
  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
    {children}
    {sub && <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)' }}>{sub}</span>}
  </div>
);

/* ─── Intel Card ───────────────────────────────────────────────────── */
const IntelCard = ({ story, onClick }) => {
  const score = story.total_score || 0;
  const isArxiv = story.source?.toLowerCase() === 'arxiv';
  
  return (
    <div
      onClick={onClick}
      style={{ ...card, padding: 16, transition: 'all 0.2s', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--amber)', background: 'var(--amber-dim)', padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginBottom: 8 }}>
        {score}% {score >= 50 ? 'HIGH' : score >= 40 ? 'MID' : 'LOW'}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: 6 }}>
        {story.title}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10, flex: 1 }}>
        {story.summary ? story.summary.slice(0, 120) + (story.summary.length > 120 ? '…' : '') : 'No summary available.'}
      </div>
      {story.angle && (
        <div style={{ fontSize: 11, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.5, padding: '8px 10px', background: 'rgba(108,99,255,0.08)', borderRadius: 6, borderLeft: '2px solid var(--accent)', marginBottom: 10 }}>
          "{story.angle}"
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'var(--accent-glow)', color: 'var(--accent)' }}>
          {story.source?.toUpperCase() || 'SOURCE'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 10, fontWeight: 500, cursor: 'pointer' }}
        >
          Deep Dive →
        </button>
      </div>
    </div>
  );
};

/* ─── Quick Access Tile ────────────────────────────────────────────── */
const QuickTile = ({ icon: Icon, label, desc, onClick }) => (
  <button
    onClick={onClick}
    style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
  >
    <div style={{ fontSize: 16, marginBottom: 2 }}><Icon style={{ width: 16, height: 16, color: 'var(--text2)' }} /></div>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{desc}</div>
  </button>
);

/* ─── Main Component ───────────────────────────────────────────────── */
const DashboardView = ({ handleRunPipeline }) => {
  const navigate = useNavigate();
  
  // Get data from context (T10 refactoring)
  const { stories = [], loading } = useStoriesContext();

  // Fetch analytics data to match Analytics page
  const [analyticsStats, setAnalyticsStats] = React.useState(null);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await apiFetch('/analytics');
        if (res.ok) {
          const data = await res.json();
          setAnalyticsStats({
            total: data.total_articles || 0,
            analyzed: data.processed_articles || 0,
            avgScore: Math.round(data.avg_viral_score || 0),
            withContent: Object.values(data.content_generation?.by_platform || {}).reduce((a, b) => a + b, 0)
          });
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Setup Guide dismiss state (Phase 1: T1.2)
  const [setupDismissed, setSetupDismissed] = React.useState(() => {
    return localStorage.getItem('pulse-setup-dismissed') === 'true';
  });

  const handleDismissSetup = () => {
    localStorage.setItem('pulse-setup-dismissed', 'true');
    setSetupDismissed(true);
  };

  const intelCards = React.useMemo(() =>
    [...stories].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)).slice(0, 6),
    [stories]
  );

  const totalArticles = analyticsStats?.total || stories.length;
  const analyzed = analyticsStats?.analyzed || stories.filter(s => s.summary).length;
  const contentReady = analyticsStats?.withContent || stories.filter(s => s.posts?.length > 0).length;
  const qualityPct = analyticsStats?.avgScore || (totalArticles > 0 ? Math.round((analyzed / totalArticles) * 100) : 0);
  const coveragePct = totalArticles > 0 ? Math.round((analyzed / totalArticles) * 100) : 0;

  const quickNav = [
    { id: 'articles',  label: 'Production Feed',    icon: BookOpen,  desc: `${contentReady} ready to publish` },
    { id: 'analytics', label: 'Metrics Engine',      icon: BarChart3, desc: `${qualityPct}% quality index` },
    { id: 'research',  label: 'Research Hub',        icon: Search,    desc: `${totalArticles} papers indexed` },
    { id: 'podcast',   label: 'Podcast Studio',      icon: Mic,       desc: 'AI Synthesis Pipeline' },
    { id: 'calendar',  label: 'Editorial Calendar',  icon: Calendar,  desc: 'Schedule & planning' },
    { id: 'settings',  label: 'Strategy Lab',        icon: Settings,  desc: 'System configuration' },
  ];

  return (
    <FeatureErrorBoundary name="Dashboard">
      <div style={{ paddingBottom: 48 }}>

        {/* ── Setup Guide ── */}
        {!setupDismissed && (
          <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>Setup Guide</div>
            <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
              {[
                { label: 'Add Source', done: totalArticles > 0 },
                { label: 'Configure LLM', done: true },
                { label: 'First Fetch', done: totalArticles > 0 },
                { label: 'Generate Article', done: contentReady > 0, active: contentReady === 0 },
                { label: 'Publish', done: false },
              ].map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: step.done ? 'var(--green)' : step.active ? 'var(--text)' : 'var(--text2)', fontWeight: step.active ? 500 : 400 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid currentColor`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, background: step.done ? 'var(--green)' : 'transparent', color: step.done ? '#fff' : 'currentColor' }}>
                      {step.done ? '✓' : i + 1}
                    </div>
                    {step.label}
                  </div>
                  {i < arr.length - 1 && <span style={{ color: 'var(--text3)', fontSize: 10 }}>›</span>}
                </React.Fragment>
              ))}
            </div>
            <button 
              onClick={handleDismissSetup}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Pipeline Live Status ── */}
        <div style={{ ...card, padding: '16px 18px', marginBottom: 20 }}>
          <SectionLabel>
            <Zap style={{ width: 14, height: 14, color: 'var(--accent)' }} />
            Pipeline Live Status
          </SectionLabel>
          <PipelineStatus />
        </div>

        {/* ── KPI Cards (Primary Metrics) - Matching Analytics Page ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Intelligence Base', value: totalArticles,       trend: '↑ +12 today',   trendUp: true,  sub: 'Live feed', action: 'articles' },
            { label: 'AI Processed',      value: analyzed,    trend: `↑ ${qualityPct}% coverage`, trendUp: true, sub: 'High accuracy', action: 'analyzed' },
            { label: 'Quality Index',     value: `${qualityPct}%`, trend: qualityPct < 50 ? '↓ Run pipeline to improve' : '↑ Good', trendUp: qualityPct >= 50, sub: '', action: 'scores' },
            { label: 'Content Ready',     value: contentReady, trend: '↑ +5 today',    trendUp: true,  sub: 'Generation ready', action: 'ready' },
          ].map((item, i) => (
            <div
              key={i}
              style={{ 
                ...card, 
                padding: '20px 22px',
                transition: 'all 0.15s', 
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onClick={() => {
                if (item.action === 'articles') navigate('/articles');
                else if (item.action === 'analyzed') navigate('/articles?filter=analyzed');
                else if (item.action === 'scores') navigate('/articles');
                else if (item.action === 'ready') navigate('/articles?filter=ready');
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{item.value ?? 0}</div>
              <div style={{ fontSize: 11, color: item.trendUp ? 'var(--green)' : 'var(--red)', marginTop: 8, fontWeight: 500 }}>{item.trend}</div>
              {item.sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{item.sub}</div>}
            </div>
          ))}
        </div>

        {/* ── Live Intelligence Feed ── */}
        <div style={{ marginBottom: 18 }}>
          <SectionLabel sub={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}>
            Live Intelligence Feed
          </SectionLabel>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 180, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />)}
            </div>
          ) : intelCards.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'stretch' }}>
              {intelCards.map(story => {
                const isArxiv = story.source?.toLowerCase() === 'arxiv';
                const targetUrl = isArxiv ? `/research?paper=${story.id}` : `/articles?story=${story.id}`;
                return (
                  <IntelCard 
                    key={story.id} 
                    story={story} 
                    onClick={() => navigate(targetUrl)} 
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ ...card, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No intelligence yet</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Run the pipeline to fetch articles</div>
              <button onClick={handleRunPipeline} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                ▶ Run Pipeline
              </button>
            </div>
          )}
        </div>

        {/* ── Quick Access ── */}
        <div style={{ ...card, padding: '16px 18px', marginBottom: 18 }}>
          <SectionLabel>Quick Access</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {quickNav.map(item => (
              <QuickTile key={item.id} icon={item.icon} label={item.label} desc={item.desc} onClick={() => navigate(`/${item.id}`)} />
            ))}
          </div>
          <div style={{ 
            fontSize: 10, 
            color: 'var(--text3)', 
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <kbd style={{ 
              padding: '2px 6px', 
              borderRadius: 4, 
              background: 'var(--surface2)', 
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9
            }}>
              ?
            </kbd>
            <span>Press for keyboard shortcuts</span>
          </div>
        </div>

      </div>
    </FeatureErrorBoundary>
  );
};

export default DashboardView;
