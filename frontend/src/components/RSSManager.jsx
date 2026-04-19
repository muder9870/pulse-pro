import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Plus, Trash2, RefreshCw, Upload, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

function RSSManager() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('AI/ML');
  const [importing, setImporting] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);

  const categories = [
    'AI/ML', 'LLM', 'Computer Vision', 'NLP', 'Robotics', 
    'Reinforcement Learning', 'Research', 'Industry', 'News'
  ];

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const response = await apiFetch('/rss/feeds');
      if (response.ok) {
        const data = await response.json();
        setFeeds(data.feeds || []);
      }
    } catch (error) {
      console.error('Failed to fetch RSS feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFeed = async () => {
    if (!newFeedUrl.trim()) return;
    
    setAdding(true);
    try {
      const response = await apiFetch('/rss/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newFeedUrl.trim(),
          category: newFeedCategory
        })
      });

      if (response.ok) {
        setNewFeedUrl('');
        setNewFeedCategory('AI/ML');
        await fetchFeeds();
      } else {
        const error = await response.json();
        alert(`Failed to add feed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to add feed: ${error.message}`);
    } finally {
      setAdding(false);
    }
  };

  const deleteFeed = async (feedId) => {
    if (!confirm('Are you sure you want to delete this RSS feed?')) return;

    try {
      const response = await apiFetch(`rss/feeds/${feedId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFeeds();
      } else {
        alert('Failed to delete feed');
      }
    } catch (error) {
      alert(`Failed to delete feed: ${error.message}`);
    }
  };

  const toggleFeed = async (feedId, active) => {
    try {
      const response = await apiFetch(`rss/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active })
      });

      if (response.ok) {
        await fetchFeeds();
      }
    } catch (error) {
      console.error('Failed to toggle feed:', error);
    }
  };

  const fetchAllFeeds = async () => {
    setFetchingAll(true);
    try {
      const response = await apiFetch('/rss/fetch-all', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Fetched ${data.total_new_items} new items from ${Object.keys(data.results).length} feeds`);
        await fetchFeeds();
      } else {
        alert('Failed to fetch feeds');
      }
    } catch (error) {
      alert(`Failed to fetch feeds: ${error.message}`);
    } finally {
      setFetchingAll(false);
    }
  };

  const addDefaultFeeds = async () => {
    if (!confirm('Add 35+ default AI/ML RSS feeds? This may take a moment.')) return;

    setAdding(true);
    try {
      const response = await apiFetch('/rss/add-defaults', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.failed && data.failed > 0) {
          const totalAttempted = data.added + data.failed;
          let message = `Added ${data.added} out of ${totalAttempted} feeds. ${data.failed} feeds failed.`;
          if (data.failures && data.failures.length > 0) {
            console.log('Failed feeds:', data.failures);
            message += '\n\nCheck console for details about failed feeds.';
          }
          alert(message);
        } else if (data.added === 0) {
          alert('Failed to add default feeds');
        } else {
          alert(`Added ${data.added} default RSS feeds`);
        }
        
        await fetchFeeds();
      } else {
        alert('Failed to add default feeds');
      }
    } catch (error) {
      alert(`Failed to add default feeds: ${error.message}`);
    } finally {
      setAdding(false);
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const response = await apiFetch('/rss/import-opml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opml_content: content })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Imported ${data.added} RSS feeds from OPML file`);
        await fetchFeeds();
      } else {
        const error = await response.json();
        alert(`Failed to import OPML: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Failed to import OPML: ${error.message}`);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const getStatusIcon = (feed) => {
    if (feed.last_error) {
      return <XCircle style={{ width: 16, height: 16, color: 'var(--red)' }} title={feed.last_error} />;
    } else if (feed.fetch_count > 0) {
      return <CheckCircle style={{ width: 16, height: 16, color: 'var(--green)' }} title="Working" />;
    } else {
      return <AlertCircle style={{ width: 16, height: 16, color: 'var(--amber)' }} title="Not fetched yet" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
        <RefreshCw className="animate-spin" style={{ width: 24, height: 24, color: 'var(--accent)' }} />
        <span style={{ marginLeft: 8, color: 'var(--text2)' }}>Loading RSS feeds...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
            Source Manager
          </h2>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginTop: 6, opacity: 0.8 }}>
            Configure and synchronize intelligence intake streams
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchAllFeeds}
            disabled={fetchingAll}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 10, border: '1px solid var(--teal)',
              background: 'var(--teal-dim)', color: 'var(--teal)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', opacity: fetchingAll ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--teal)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--teal-dim)'}
          >
            <RefreshCw style={{ width: 14, height: 14 }} className={fetchingAll ? 'animate-spin' : ''} />
            {fetchingAll ? 'Syncing...' : 'Sync All Sources'}
          </button>
        </div>
      </div>

      {/* Add Feed Form */}
      <div style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 4, height: 16, background: 'var(--accent)', borderRadius: 2 }} />
          <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)' }}>Register New Source</h3>
        </div>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <input
              type="url"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              placeholder="Enter RSS or Atom Feed URL"
              style={{
                width: '100%',
                padding: '10px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg3)',
                color: 'var(--text)', fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <select
            value={newFeedCategory}
            onChange={(e) => setNewFeedCategory(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg3)',
              color: 'var(--text)', fontSize: 13, cursor: 'pointer',
              outline: 'none',
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={addFeed}
            disabled={adding || !newFeedUrl.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', opacity: (adding || !newFeedUrl.trim()) ? 0.5 : 1,
              transition: 'transform 0.1s, opacity 0.2s',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {adding ? <RefreshCw className="animate-spin" style={{ width: 14, height: 14 }} /> : <Plus style={{ width: 16, height: 16 }} />}
            {adding ? 'Processing...' : 'Register Source'}
          </button>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <button
            onClick={addDefaultFeeds}
            disabled={adding}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent2)',
              background: 'transparent', color: 'var(--accent2)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', opacity: adding ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent2)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent2)'; }}
          >
            <Download style={{ width: 14, height: 14 }} />
            Load Preset AI/ML Library
          </button>
          
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--amber)',
            background: 'transparent', color: 'var(--amber)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', opacity: importing ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--amber)'; }}>
            <Upload style={{ width: 14, height: 14 }} />
            {importing ? 'Importing...' : 'Import OPML Bundle'}
            <input
              type="file"
              accept=".opml,.xml"
              onChange={handleFileImport}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Feeds List */}
      <div style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface2)'
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)' }}>
            Active Intelligence Streams ({feeds.length})
          </h3>
        </div>
        
        {feeds.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text2)' }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>📡</div>
            <p style={{ fontWeight: 500 }}>No active streams detected.</p>
            <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text3)' }}>Register a source above to begin ingestion.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
            {feeds.map((feed) => (
              <div key={feed.id} className="source-row">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
                  {getStatusIcon(feed)}
                </div>

                <div className="source-name-col">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                    <span className="source-name-text">
                      {feed.title}
                    </span>
                    <span className="pp-badge pp-badge-accent">
                      {feed.category}
                    </span>
                  </div>
                  <div className="source-url-text">
                    {feed.url}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                      {feed.total_items} items
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                      Synced {formatDate(feed.last_fetched)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div 
                      onClick={() => toggleFeed(feed.id, feed.active)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '4px 10px', borderRadius: 20,
                        background: feed.active ? 'var(--green-dim)' : 'var(--surface2)',
                        border: `1px solid ${feed.active ? 'var(--green)' : 'var(--border)'}`,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: 6, height: 6, borderRadius: '50%', 
                        background: feed.active ? 'var(--green)' : 'var(--text3)',
                        boxShadow: feed.active ? '0 0 6px var(--green)' : 'none'
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: feed.active ? 'var(--green)' : 'var(--text3)' }}>
                        {feed.active ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => deleteFeed(feed.id)}
                      className="pp-btn pp-btn-ghost"
                      style={{ padding: 6, borderRadius: 8, border: 'none' }}
                      title="Remove source"
                    >
                      <Trash2 style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        background: 'rgba(108,99,255,0.05)', 
        border: '1px dashed var(--accent)',
        borderRadius: 'var(--radius-lg)', 
        padding: '20px',
        display: 'flex',
        gap: 16,
      }}>
        <div style={{ fontSize: 24, opacity: 0.6 }}>💡</div>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase' }}>Onboarding Your Sources</h4>
          <ol style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 20 }}>
            <li>Export your subscriptions from your current RSS reader as an **OPML file**.</li>
            <li>Click **"Import OPML Bundle"** above and select the file.</li>
            <li>Pulse Pro will automatically map and register all streams into the decision engine.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default RSSManager;