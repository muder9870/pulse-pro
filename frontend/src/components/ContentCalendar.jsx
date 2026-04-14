import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Clock, Trash2, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function PostDetailModal({ post, onClose, onDelete, onViewArticle }) {
  const d = new Date(post.scheduled_at || post.scheduled_time);
  const statusColor = post.status === 'posted' ? 'var(--green)' : post.status === 'failed' ? 'var(--red)' : 'var(--accent)';
  const statusBg = post.status === 'posted' ? 'var(--green-dim)' : post.status === 'failed' ? 'var(--red-dim)' : 'var(--accent-glow)';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: '20px 24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: statusBg, color: statusColor }}>{post.status}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{post.platform}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{post.article_title || post.title || 'Untitled'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, lineHeight: 1 }}>x</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <Clock style={{ width: 14, height: 14, color: 'var(--text3)' }} />
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scheduled for</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          {post.error_message && <div style={{ padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, fontSize: 11, color: 'var(--red)' }}>{post.error_message}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={(e) => onDelete(post.id, e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--red)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            <Trash2 style={{ width: 12, height: 12 }} /> Remove Schedule
          </button>
          <button onClick={onViewArticle} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            View Article
          </button>
        </div>
      </div>
    </div>
  );
}

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 18px',
};

export default function ContentCalendar() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());

  const navigate = useNavigate();
  const today = new Date();

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedule/list');
      const data = await res.json();
      if (res.ok) {
        // API returns either { posts: [] } or a flat array
        const list = Array.isArray(data) ? data : (data.posts || []);
        setPosts(list);
      } else {
        setError(data.error || 'Failed to load queue');
      }
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  // Build calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  // Dates that have scheduled posts
  const scheduledDates = new Set(
    posts.map(p => {
      const d = new Date(p.scheduled_at || p.scheduled_time);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const hasEvent = (d, m, y) => scheduledDates.has(`${y}-${m}-${d}`);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Upcoming posts (next 5)
  const upcoming = [...posts]
    .filter(p => new Date(p.scheduled_at || p.scheduled_time) >= today)
    .sort((a, b) => new Date(a.scheduled_at || a.scheduled_time) - new Date(b.scheduled_at || b.scheduled_time))
    .slice(0, 5);

  const [selectedPost, setSelectedPost] = useState(null);

  const handleDeleteSchedule = async (postId, e) => {
    e.stopPropagation();
    if (!window.confirm('Remove this scheduled post? The article and its generated content will NOT be deleted.')) return;
    try {
      const res = await fetch(`/api/schedule/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch { alert('Connection failed'); }
  };

  // Build grid cells
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const cells = [];
  // Prev month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, type: 'prev' });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current', event: hasEvent(d, month, year) });
  }
  // Next month leading days
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: 'next' });
  }

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            Editorial Calendar
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
            Schedule & planning · {MONTHS[month]} {year}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={prevMonth}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
          >
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button
            onClick={nextMonth}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
          >
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
          <button
            onClick={fetchQueue}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
          >
            <RefreshCw style={{ width: 12, height: 12 }} />
          </button>
          <button
            onClick={() => navigate('/articles')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
          >
            <Plus style={{ width: 12, height: 12 }} /> Schedule Post
          </button>
        </div>
      </div>

      {/* ── 2-col: Calendar + Upcoming ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* Calendar Grid */}
        <div style={card}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {cells.map((cell, i) => {
              const isTodayCell = cell.type === 'current' && isToday(cell.day);
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s',
                    background: isTodayCell ? 'var(--accent)' : 'transparent',
                    color: isTodayCell ? '#fff' : cell.type !== 'current' ? 'var(--text3)' : 'var(--text)',
                    fontWeight: isTodayCell ? 700 : 400,
                  }}
                  onMouseEnter={e => { if (!isTodayCell) e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={e => { if (!isTodayCell) e.currentTarget.style.background = 'transparent'; }}
                >
                  {cell.day}
                  {cell.event && (
                    <span style={{
                      position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: isTodayCell ? '#fff' : 'var(--teal)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Upcoming</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              [1,2,3].map(i => <div key={i} style={{ height: 64, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />)
            ) : upcoming.length > 0 ? (
              upcoming.map((post, i) => {
                const d = new Date(post.scheduled_at || post.scheduled_time);
                const isPostToday = d.toDateString() === today.toDateString();
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedPost(post)}
                    style={{ ...card, padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: isPostToday ? 'var(--accent)' : 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {isPostToday ? 'TODAY · ' : ''}{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                      {(post.article_title || post.title || 'Untitled')?.slice(0, 50)}{(post.article_title || post.title || '').length > 50 ? '…' : ''}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock style={{ width: 10, height: 10 }} />
                      {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {post.platform}
                    </div>
                    {post.error_message && (
                      <div style={{ marginTop: 6, padding: '4px 8px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, fontSize: 10, color: 'var(--red)', display: 'flex', gap: 4 }}>
                        <AlertCircle style={{ width: 10, height: 10, flexShrink: 0, marginTop: 1 }} />
                        {post.error_message}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ ...card, padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Queue is empty</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>Generate content and schedule it to see it here</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Scheduled Posts List ── */}
      {posts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
            All Scheduled Posts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {posts.map((post, i) => {
              const d = new Date(post.scheduled_at || post.scheduled_time);
              const statusColor = post.status === 'posted' ? 'var(--green)' : post.status === 'failed' ? 'var(--red)' : 'var(--accent)';
              const statusBg = post.status === 'posted' ? 'var(--green-dim)' : post.status === 'failed' ? 'var(--red-dim)' : 'var(--accent-glow)';
              return (
                <div key={post.id || i} style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => setSelectedPost(post)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: statusBg, color: statusColor }}>
                        {post.status}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{post.platform}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{post.article_title || post.title || 'Untitled'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock style={{ width: 11, height: 11 }} />
                      {d.toLocaleString()}
                    </div>
                    {post.error_message && (
                      <div style={{ marginTop: 6, padding: '4px 8px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, fontSize: 10, color: 'var(--red)', display: 'flex', gap: 4 }}>
                        <AlertCircle style={{ width: 10, height: 10, flexShrink: 0, marginTop: 1 }} />
                        {post.error_message}
                      </div>
                    )}
                  </div>
                  <button style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                    onClick={(e) => handleDeleteSchedule(post.id, e)}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    title="Remove from schedule (article & content kept)"
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Post Detail Modal ── */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={(id, e) => { setSelectedPost(null); handleDeleteSchedule(id, e); }}
          onViewArticle={() => { setSelectedPost(null); navigate('/articles'); }}
        />
      )}
    </div>
  );
}
