import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Upload, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Input from './ui/Input';
import Select from './ui/Select';
import Checkbox from './ui/Checkbox';

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
      const response = await fetch('/api/rss/feeds');
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
      const response = await fetch('/api/rss/feeds', {
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
      const response = await fetch(`/api/rss/feeds/${feedId}`, {
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
      const response = await fetch(`/api/rss/feeds/${feedId}`, {
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
      const response = await fetch('/api/rss/fetch-all', {
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
      const response = await fetch('/api/rss/add-defaults', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check for partial success
        if (data.failed && data.failed > 0) {
          // Partial success: some feeds added, some failed
          const totalAttempted = data.added + data.failed;
          let message = `Added ${data.added} out of ${totalAttempted} feeds. ${data.failed} feeds failed.`;
          
          // Optionally log failure details for user action
          if (data.failures && data.failures.length > 0) {
            console.log('Failed feeds:', data.failures);
            message += '\n\nCheck console for details about failed feeds.';
          }
          
          alert(message);
        } else if (data.added === 0) {
          // Complete failure
          alert('Failed to add default feeds');
        } else {
          // All success
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
      const response = await fetch('/api/rss/import-opml', {
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
      event.target.value = ''; // Reset file input
    }
  };

  const getStatusIcon = (feed) => {
    if (feed.last_error) {
      return <XCircle className="w-4 h-4 text-red-500" title={feed.last_error} />;
    } else if (feed.fetch_count > 0) {
      return <CheckCircle className="w-4 h-4 text-green-500" title="Working" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-yellow-500" title="Not fetched yet" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading RSS feeds...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">RSS Feed Manager</h2>
          <p className="text-gray-600">Manage your AI/ML content sources</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAllFeeds}
            disabled={fetchingAll}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingAll ? 'animate-spin' : ''}`} />
            {fetchingAll ? 'Fetching...' : 'Fetch All'}
          </button>
        </div>
      </div>

      {/* Add Feed Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Add New RSS Feed</h3>
        <div className="flex gap-4">
          <Input
            type="url"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            fullWidth
          />
          <Select
            value={newFeedCategory}
            onChange={(e) => setNewFeedCategory(e.target.value)}
            options={categories}
          />
          <button
            onClick={addFeed}
            disabled={adding || !newFeedUrl.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add Feed'}
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={addDefaultFeeds}
            disabled={adding}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            <Download className="w-4 h-4" />
            Add 35+ Default Feeds
          </button>
          
          <label className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import OPML'}
            <input
              type="file"
              accept=".opml,.xml"
              onChange={handleFileImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Feeds List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">RSS Feeds ({feeds.length})</h3>
        </div>
        
        {feeds.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No RSS feeds configured yet.</p>
            <p className="text-sm mt-2">Add some feeds above or import from OPML to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {feeds.map((feed) => (
              <div key={feed.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(feed)}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {feed.title}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {feed.url}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {feed.category}
                      </span>
                      <span>{feed.total_items} items</span>
                      <span>{feed.fetch_count} fetches</span>
                      <span>Last: {formatDate(feed.last_fetched)}</span>
                      {feed.error_count > 0 && (
                        <span className="text-red-600">{feed.error_count} errors</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Checkbox
                      checked={feed.active}
                      onChange={() => toggleFeed(feed.id, feed.active)}
                      label="Active"
                    />
                    
                    <button
                      onClick={() => deleteFeed(feed.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete feed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">How to get your 38 Inoreader sources:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Go to Inoreader → Settings → Import/Export</li>
          <li>Click "Export subscriptions as OPML"</li>
          <li>Save the .opml file to your computer</li>
          <li>Use the "Import OPML" button above to upload it</li>
          <li>All your 38 sources will be added automatically!</li>
        </ol>
      </div>
    </div>
  );
}

export default RSSManager;