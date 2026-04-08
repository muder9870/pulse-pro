import React, { useEffect, useState } from 'react';
import Input from './ui/Input';
import Checkbox from './ui/Checkbox';

export default function BlogPublisher({ open, onClose, articleId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [post, setPost] = useState(null);
  const [publications, setPublications] = useState([]);
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  const [devtoKey, setDevtoKey] = useState('');
  const [devtoEnabled, setDevtoEnabled] = useState(true);
  const [mediumKey, setMediumKey] = useState('');
  const [mediumEnabled, setMediumEnabled] = useState(true);
  const [wpSiteUrl, setWpSiteUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [wpEnabled, setWpEnabled] = useState(true);
  const [localEnabled, setLocalEnabled] = useState(true);
  const [credLoading, setCredLoading] = useState(false);
  const [validation, setValidation] = useState({ devto: null, medium: null, wordpress: null });

  const loadCreds = async () => {
    try {
      const [dRes, mRes, wRes] = await Promise.all([
        fetch('/api/blog/credentials/devto'),
        fetch('/api/blog/credentials/medium'),
        fetch('/api/blog/credentials/wordpress'),
      ]);

      const dData = await dRes.json();
      if (dRes.ok) {
        const cred = dData.credential || dData;
        setDevtoEnabled(Boolean(cred.enabled));
      }

      const mData = await mRes.json();
      if (mRes.ok) {
        const cred = mData.credential || mData;
        setMediumEnabled(Boolean(cred.enabled));
      }

      const wData = await wRes.json();
      if (wRes.ok) {
        const cred = wData.credential || wData;
        setWpEnabled(Boolean(cred.enabled));
        setWpSiteUrl(cred.site_url || '');
        setWpUsername(cred.username || '');
      }
    } catch (_) {}
  };

  const saveDevtoCred = async () => {
    setCredLoading(true);
    try {
      const res = await fetch('/api/blog/credentials/devto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: devtoKey, enabled: devtoEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');
      if (devtoKey.trim()) setDevtoKey('');
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setCredLoading(false);
    }
  };

  const saveMediumCred = async () => {
    setCredLoading(true);
    try {
      const res = await fetch('/api/blog/credentials/medium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: mediumKey, enabled: mediumEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');
      if (mediumKey.trim()) setMediumKey('');
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setCredLoading(false);
    }
  };

  const saveWordpressCred = async () => {
    setCredLoading(true);
    try {
      const res = await fetch('/api/blog/credentials/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: wpEnabled,
          site_url: wpSiteUrl,
          username: wpUsername,
          api_key: wpAppPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');
      if (wpAppPassword.trim()) setWpAppPassword('');
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setCredLoading(false);
    }
  };

  const validateCred = async (platform) => {
    setCredLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog/credentials/validate/${platform}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to validate');
      setValidation((prev) => ({ ...prev, [platform]: data }));
    } catch (e) {
      setError(String(e.message || e));
      setValidation((prev) => ({ ...prev, [platform]: { status: 'error', valid: false, detail: { error: String(e.message || e) } } }));
    } finally {
      setCredLoading(false);
    }
  };

  const publishBatch = async (published = false) => {
    if (!post?.id) return;
    const platforms = [];
    if (devtoEnabled) platforms.push('devto');
    if (mediumEnabled) platforms.push('medium');
    if (wpEnabled) platforms.push('wordpress');
    if (localEnabled) platforms.push('local');
    if (platforms.length === 0) return;

    setPublishLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/blog/publish/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_post_id: post.id, platforms, published }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) throw new Error(data.error || 'Publish failed');
      if (Array.isArray(data.publications) && data.publications.length > 0) {
        setPublications((prev) => [...data.publications, ...prev]);
      }
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        setError(data.errors.join(' | '));
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setPublishLoading(false);
    }
  };

  const generate = async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/blog/generate/${articleId}${regenerate ? '?regenerate=1' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate blog post');
      setPost(data.blog_post);
      setPublications(Array.isArray(data.publications) ? data.publications : []);
      setContent(data.blog_post?.content || '');
      setExcerpt(data.blog_post?.excerpt || '');
      setFocusKeyword(data.blog_post?.focus_keyword || '');
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!post?.id) return;
    setSaveLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/blog/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blog_post_id: post.id,
          content,
          excerpt,
          focus_keyword: focusKeyword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save blog post');
      setPost(data.blog_post);
      setPublications(Array.isArray(data.publications) ? data.publications : []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaveLoading(false);
    }
  };

  const publishDevto = async (published = false) => {
    if (!post?.id) return;
    setPublishLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_post_id: post.id, platform: 'devto', published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      const pub = data.publication;
      if (pub) setPublications((prev) => [pub, ...prev]);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setPublishLoading(false);
    }
  };

  const publishMedium = async (published = false) => {
    if (!post?.id) return;
    setPublishLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_post_id: post.id, platform: 'medium', published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      const pub = data.publication;
      if (pub) setPublications((prev) => [pub, ...prev]);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setPublishLoading(false);
    }
  };

  const publishWordpress = async (published = false) => {
    if (!post?.id) return;
    setPublishLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_post_id: post.id, platform: 'wordpress', published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      const pub = data.publication;
      if (pub) setPublications((prev) => [pub, ...prev]);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setPublishLoading(false);
    }
  };

  const publishLocal = async () => {
    if (!post?.id) return;
    setPublishLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_post_id: post.id, platform: 'local', published: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      const pub = data.publication;
      if (pub) setPublications((prev) => [pub, ...prev]);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setPublishLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadCreds();
    setPost(null);
    setPublications([]);
    setContent('');
    setExcerpt('');
    setFocusKeyword('');
    setValidation({ devto: null, medium: null, wordpress: null });
    setError(null);
  }, [open, articleId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-4 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl">
        <div className="w-full rounded-lg bg-white shadow-xl border border-gray-200 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Blog Publisher</h2>
            {post && (
              <p className="text-xs text-gray-500">
                Slug: {post.slug} • Words: {post.word_count} • Read: {post.reading_time} min
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Close
          </button>
        </div>

        <div className="flex-1 min-h-0 px-3 sm:px-5 py-3 sm:py-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => generate(false)}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
            <button
              onClick={() => generate(true)}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Regenerate
            </button>
            <button
              onClick={save}
              disabled={!post?.id || saveLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                !post?.id || saveLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saveLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => publishBatch(false)}
              disabled={!post?.id || publishLoading || (!devtoEnabled && !mediumEnabled && !wpEnabled && !localEnabled)}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                !post?.id || publishLoading || (!devtoEnabled && !mediumEnabled && !wpEnabled && !localEnabled)
                  ? 'bg-green-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {publishLoading ? 'Publishing...' : 'Publish Draft (All)'}
            </button>
            <button
              onClick={() => publishBatch(true)}
              disabled={!post?.id || publishLoading || (!devtoEnabled && !mediumEnabled && !wpEnabled && !localEnabled)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Publish Public (All)
            </button>
          </div>

          {post && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-600">Meta Description</div>
                  <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                    {post.meta_description || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Readability</div>
                  <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                    {post.readability_score ?? '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Input
                    label="Excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    fullWidth
                  />
                </div>
                <div>
                  <Input
                    label="Focus Keyword"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    fullWidth
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-700">Content (Markdown)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[200px] sm:min-h-[280px] border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="text-sm font-semibold text-gray-800">Dev.to</div>
                <Checkbox
                  checked={devtoEnabled}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setDevtoEnabled(v);
                    fetch('/api/blog/credentials/devto', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ enabled: v }),
                    }).catch(() => {});
                  }}
                  label="Enable Dev.to publishing"
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Input
                    value={devtoKey}
                    onChange={(e) => setDevtoKey(e.target.value)}
                    placeholder="Dev.to API key (optional if set in env)"
                    fullWidth
                  />
                  <button
                    onClick={saveDevtoCred}
                    disabled={credLoading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    {credLoading ? 'Saving...' : 'Save Key'}
                  </button>
                  <button
                    onClick={() => validateCred('devto')}
                    disabled={credLoading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Validate
                  </button>
                </div>
                {validation.devto && (
                  <div className={`text-xs rounded border px-3 py-2 ${validation.devto.valid ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                    {validation.devto.valid ? `OK${validation.devto.detail?.username ? ` • ${validation.devto.detail.username}` : ''}` : (validation.devto.detail?.error || 'Not valid')}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => publishDevto(false)}
                    disabled={publishLoading || !devtoEnabled}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                      publishLoading || !devtoEnabled ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {publishLoading ? 'Publishing...' : 'Publish Draft'}
                  </button>
                  <button
                    onClick={() => publishDevto(true)}
                    disabled={publishLoading || !devtoEnabled}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Publish Public
                  </button>
                </div>

                {publications.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Publication History
                    </div>
                    <div className="space-y-2">
                      {publications.slice(0, 5).map((p) => (
                        <div key={p.id} className="text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                          <div>
                            <span className="font-semibold">{p.platform}</span> • {p.status}
                          </div>
                          {p.url && (
                            <a className="text-blue-700 underline" href={p.url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-800">Medium</div>
                  <Checkbox
                    checked={mediumEnabled}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setMediumEnabled(v);
                      fetch('/api/blog/credentials/medium', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: v }),
                      }).catch(() => {});
                    }}
                    label="Enable Medium publishing"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input
                      value={mediumKey}
                      onChange={(e) => setMediumKey(e.target.value)}
                      placeholder="Medium token (optional if set in env)"
                      fullWidth
                    />
                    <button
                      onClick={saveMediumCred}
                      disabled={credLoading}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      {credLoading ? 'Saving...' : 'Save Token'}
                    </button>
                    <button
                      onClick={() => validateCred('medium')}
                      disabled={credLoading}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Validate
                    </button>
                  </div>
                  {validation.medium && (
                    <div className={`text-xs rounded border px-3 py-2 ${validation.medium.valid ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                      {validation.medium.valid ? `OK${validation.medium.detail?.user_id ? ` • ${validation.medium.detail.user_id}` : ''}` : (validation.medium.detail?.error || 'Not valid')}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => publishMedium(false)}
                      disabled={publishLoading || !mediumEnabled}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                        publishLoading || !mediumEnabled ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {publishLoading ? 'Publishing...' : 'Publish Draft'}
                    </button>
                    <button
                      onClick={() => publishMedium(true)}
                      disabled={publishLoading || !mediumEnabled}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Publish Public
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-800">WordPress</div>
                  <Checkbox
                    checked={wpEnabled}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setWpEnabled(v);
                      fetch('/api/blog/credentials/wordpress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: v }),
                      }).catch(() => {});
                    }}
                    label="Enable WordPress publishing"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      value={wpSiteUrl}
                      onChange={(e) => setWpSiteUrl(e.target.value)}
                      placeholder="Site URL (https://yoursite.com)"
                      className="md:col-span-2"
                      fullWidth
                    />
                    <Input
                      value={wpUsername}
                      onChange={(e) => setWpUsername(e.target.value)}
                      placeholder="Username"
                      fullWidth
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input
                      value={wpAppPassword}
                      onChange={(e) => setWpAppPassword(e.target.value)}
                      placeholder="App Password (stored as credential)"
                      fullWidth
                    />
                    <button
                      onClick={saveWordpressCred}
                      disabled={credLoading}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      {credLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => validateCred('wordpress')}
                      disabled={credLoading}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Validate
                    </button>
                  </div>
                  {validation.wordpress && (
                    <div className={`text-xs rounded border px-3 py-2 ${validation.wordpress.valid ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                      {validation.wordpress.valid ? `OK${validation.wordpress.detail?.site_name ? ` • ${validation.wordpress.detail.site_name}` : ''}` : (validation.wordpress.detail?.error || 'Not valid')}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => publishWordpress(false)}
                      disabled={publishLoading || !wpEnabled}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                        publishLoading || !wpEnabled ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {publishLoading ? 'Publishing...' : 'Publish Draft'}
                    </button>
                    <button
                      onClick={() => publishWordpress(true)}
                      disabled={publishLoading || !wpEnabled}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Publish Public
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-800">Local (Test)</div>
                  <Checkbox
                    checked={localEnabled}
                    onChange={(e) => setLocalEnabled(e.target.checked)}
                    label="Enable local draft publishing"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={publishLocal}
                      disabled={publishLoading || !localEnabled}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                        publishLoading || !localEnabled ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {publishLoading ? 'Publishing...' : 'Publish Draft'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
