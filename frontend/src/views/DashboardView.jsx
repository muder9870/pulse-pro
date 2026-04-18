import React from 'react';
import {
  Zap,
  BarChart3, Calendar, BookOpen,
  Mic, Search, Settings,
} from 'lucide-react';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import PipelineStatus from '../components/PipelineStatus';
import { useNavigate } from 'react-router-dom';

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
const KpiCard = ({ label, value, trend, trendUp, sub }) => (
  <div
    style={{ ...card, padding: '16px 18px', transition: 'border-color 0.15s', cursor: 'default' }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
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

/* ─── Priority Pick Row ────────────────────────────────────────────── */
const PriorityRow = ({ story, onClick }) => (
  <div
    onClick={onClick}
    style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
  >
    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
      {story.source?.toUpperCase()} · Score: {story.total_score}
    </div>
    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
      {story.title?.slice(0, 55)}{story.title?.length > 55 ? '…' : ''}
    </div>
  </div>
);

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
const DashboardView = ({ stories = [], loading, handleRunPipeline }) => {
  const navigate = useNavigate();

  const topPicks = React.useMemo(() =>
    [...stories].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)).slice(0, 4),
    [stories]
  );

  const intelCards = React.useMemo(() =>
    [...stories].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)).slice(0, 3),
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

        {/* ── Page Header ── */}
        <div style={{ display: 'none' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              Command Center
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
              Intelligence oversight and system-wide ecosystem control
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/settings')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              ⚙ Settings
            </button>
            <button
              onClick={handleRunPipeline}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              ▶ Run Pipeline
            </button>
          </div>
        </div>

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
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>Dismiss</button>
        </div>

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
          <KpiCard label="Intelligence Base" value={totalArticles} trend={`+${Math.min(12, totalArticles)} today`} trendUp />
          <KpiCard label="AI Processed" value={analyzed} sub={`${qualityPct}% coverage`} trendUp />
          <KpiCard label="Quality Index" value={`${qualityPct}%`} trend="needs more analysis" trendUp={qualityPct > 50} />
          <KpiCard label="Content Ready" value={contentReady} sub={contentReady > 0 ? `${contentReady} to publish` : 'Run pipeline'} />
        </div>

        {/* ── Main 2-col grid: Intel Feed + Priority Picks ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 18, alignItems: 'start' }}>

          {/* Intel Feed */}
          <div>
            <SectionLabel sub={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}>
              Live Intelligence Feed
            </SectionLabel>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 180, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />)}
              </div>
            ) : intelCards.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'stretch' }}>
                {intelCards.map(story => (
                  <IntelCard key={story.id} story={story} onClick={() => navigate('/articles')} />
                ))}
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

          {/* Priority Picks */}
          <div>
            <SectionLabel sub="Top Scored">Priority Picks</SectionLabel>
            <div style={{ ...card, padding: '12px 14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                  [1,2,3,4].map(i => <div key={i} style={{ height: 52, background: 'var(--bg3)', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />)
                ) : topPicks.length > 0 ? (
                  topPicks.map(story => (
                    <PriorityRow key={story.id} story={story} onClick={() => navigate('/articles')} />
                  ))
                ) : (
                  <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                    No articles yet
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/research')}
                style={{ marginTop: 10, width: '100%', display: 'flex', justifyContent: 'center', padding: '5px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
              >
                View All Research →
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Access + System Ecosystem ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>

          {/* Quick Access */}
          <div style={{ ...card, padding: '16px 18px' }}>
            <SectionLabel>Quick Access</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {quickNav.map(item => (
                <QuickTile key={item.id} icon={item.icon} label={item.label} desc={item.desc} onClick={() => navigate(`/${item.id}`)} />
              ))}
            </div>
          </div>

          {/* System Ecosystem */}
          <div style={{ ...card, padding: '16px 18px' }}>
            <SectionLabel>System Ecosystem</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'INTELLIGENCE BASE', value: totalArticles, badge: 'Active', badgeColor: 'var(--green)', badgeBg: 'var(--green-dim)' },
                { label: 'AI ANALYZED',       value: analyzed,      badge: `${qualityPct}%`, badgeColor: 'var(--accent)', badgeBg: 'var(--accent-glow)' },
                { label: 'POSTS GENERATED',   value: contentReady,  badge: 'Ready', badgeColor: 'var(--teal)', badgeBg: 'var(--teal-dim)' },
                { label: 'DEEP DIVES',        value: stories.filter(s => s.has_deep_analysis).length, badge: 'Actionable', badgeColor: 'var(--amber)', badgeBg: 'var(--amber-dim)' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{item.value}</div>
                  <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: item.badgeBg, color: item.badgeColor }}>
                    {item.badge}
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline idle warning */}
            <div style={{ background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)' }}>Pipeline idle</div>
                <div style={{ fontSize: 10, color: 'var(--text2)' }}>Run now to fetch today's content</div>
              </div>
              <button
                onClick={handleRunPipeline}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--amber)', background: 'var(--amber-dim)', color: 'var(--amber)', fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Run Now
              </button>
            </div>
          </div>
        </div>

      </div>
    </FeatureErrorBoundary>
  );
};

export default DashboardView;
