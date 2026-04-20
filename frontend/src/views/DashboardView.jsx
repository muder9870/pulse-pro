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

/* ─── KPI Card ─────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, trend, trendUp, sub, onClick }) => (
  <div
    onClick={onClick}
    style={{ 
      ...card, 
      padding: '16px 18px', 
      transition: 'all 0.15s', 
      cursor: onClick ? 'pointer' : 'default' 
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'var(--border2)';
      if (onClick) e.currentTarget.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)';
      if (onClick) e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
      {label}
    </div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
      {value}
    </div>
    {trend && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: trendUp ? 'var(--green)' : 'var(--red)' }}>
        {trendUp ? '↑' : '↓'} {trend}
      </div>
    )}
    {sub && (
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>
    )}
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

  const totalArticles = stories.length;
  const analyzed = stories.filter(s => s.summary).length;
  const contentReady = stories.filter(s => s.posts?.length > 0).length;
  const qualityPct = totalArticles > 0 ? Math.round((analyzed / totalArticles) * 100) : 0;

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

        {/* ── Focus Banner ── */}
        <section className="dashboard-hero">
          <div className="dashboard-hero-grid">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
                Front Page Overview
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1.05, marginBottom: 10 }}>
                Command Center
              </div>
              <div style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 620, lineHeight: 1.6 }}>
                One page for intake health, launch readiness, and the next move across your publishing system.
              </div>

              <div className="dashboard-hero-metrics">
                <div className="dashboard-hero-metric">
                  <span className="dashboard-hero-metric-value">{totalArticles}</span>
                  <span className="dashboard-hero-metric-label">tracked stories</span>
                </div>
                <div className="dashboard-hero-metric">
                  <span className="dashboard-hero-metric-value">{qualityPct}%</span>
                  <span className="dashboard-hero-metric-label">analysis coverage</span>
                </div>
                <div className="dashboard-hero-metric">
                  <span className="dashboard-hero-metric-value">{contentReady}</span>
                  <span className="dashboard-hero-metric-label">ready to publish</span>
                </div>
              </div>
            </div>

            <div className="dashboard-hero-actions">
              <button
                onClick={contentReady > 0 ? () => navigate('/articles') : handleRunPipeline}
                className="pp-btn pp-btn-primary"
                style={{ justifyContent: 'center' }}
              >
                {contentReady > 0 ? 'Review Launch Queue' : 'Run Pipeline'}
              </button>
              <button
                onClick={() => navigate(contentReady > 0 ? '/calendar' : '/settings')}
                className="pp-btn"
                style={{ justifyContent: 'center' }}
              >
                {contentReady > 0 ? 'Open Calendar' : 'Open Settings'}
              </button>
              <div className="dashboard-hero-note">
                <span className="pp-badge pp-badge-accent">Priority</span>
                <span>
                  {contentReady > 0
                    ? `${contentReady} article${contentReady !== 1 ? 's are' : ' is'} waiting for publication review.`
                    : 'No launch-ready content yet. Run the pipeline to refresh the front of the queue.'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {contentReady > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 20 }}>🚀</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2 }}>Today's Focus</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                {contentReady} article{contentReady !== 1 ? 's are' : ' is'} ready to launch. Publish them now to maximize reach.
              </div>
            </div>
            <button
              onClick={() => navigate('/articles')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Review & Launch →
            </button>
          </div>
        )}

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

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          <KpiCard 
            label="Intelligence Base" 
            value={totalArticles} 
            trend={`+${Math.min(12, totalArticles)} today`} 
            trendUp 
            onClick={() => navigate('/articles')}
          />
          <KpiCard 
            label="AI Processed" 
            value={analyzed} 
            sub={`${qualityPct}% coverage`} 
            trendUp 
            onClick={() => navigate('/articles?filter=analyzed')}
          />
          <KpiCard 
            label="Quality Index" 
            value={`${qualityPct}%`} 
            trend="needs more analysis" 
            trendUp={qualityPct > 50} 
            onClick={() => navigate('/analytics')}
          />
          <KpiCard 
            label="Content Ready" 
            value={contentReady} 
            sub={contentReady > 0 ? `${contentReady} to publish` : 'Run pipeline'} 
            onClick={() => contentReady > 0 ? navigate('/articles?filter=ready') : handleRunPipeline()}
          />
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
