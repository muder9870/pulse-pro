import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Flag, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useToastContext } from '../hooks/useToast';

const FeatureFlagsManager = () => {
  const toast = useToastContext();
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/system/feature-flags');
      const data = await res.json();
      if (res.ok) {
        setFlags(data.flags || {});
      }
    } catch (err) {
      console.error('Failed to fetch feature flags:', err);
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleToggle = async (flagName) => {
    const newValue = !flags[flagName];
    
    // Optimistic update
    setFlags(prev => ({ ...prev, [flagName]: newValue }));
    setSaving(true);

    try {
      const res = await apiFetch('/system/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags: { [flagName]: newValue } })
      });

      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags || {});
        toast.success(`${formatFlagName(flagName)} ${newValue ? 'enabled' : 'disabled'}`);
      } else {
        // Revert on error
        setFlags(prev => ({ ...prev, [flagName]: !newValue }));
        toast.error('Failed to update feature flag');
      }
    } catch (err) {
      // Revert on error
      setFlags(prev => ({ ...prev, [flagName]: !newValue }));
      toast.error('Failed to update feature flag: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatFlagName = (name) => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getFlagDescription = (name) => {
    const descriptions = {
      audio_generation: 'Enable AI-powered audio/podcast generation for articles',
      image_generation: 'Enable AI-powered image generation (DALL-E, Pollinations, HuggingFace)',
      quote_card_generation: 'Enable quote card generation using PIL (no API key required)',
      content_generation: 'Enable social media content generation for all platforms',
      blog_generation: 'Enable long-form blog post generation',
      research_analysis: 'Enable deep research analysis and insights',
      hashtag_recommendations: 'Enable AI-powered hashtag recommendations'
    };
    return descriptions[name] || 'Toggle this feature on or off';
  };

  const getFlagCategory = (name) => {
    if (['audio_generation', 'image_generation', 'quote_card_generation'].includes(name)) {
      return 'Media Generation';
    }
    if (['content_generation', 'blog_generation'].includes(name)) {
      return 'Content Creation';
    }
    return 'Analysis & Tools';
  };

  const groupedFlags = Object.entries(flags).reduce((acc, [name, enabled]) => {
    const category = getFlagCategory(name);
    if (!acc[category]) acc[category] = [];
    acc[category].push({ name, enabled });
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <RefreshCw style={{ width: 24, height: 24, color: 'var(--accent)' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Flag style={{ width: 20, height: 20, color: 'var(--accent)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Feature Flags
          </h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>
          Enable or disable features dynamically. Changes take effect immediately without restarting.
        </p>
      </div>

      {/* Warning Banner */}
      <div style={{ 
        padding: 12, 
        background: 'var(--amber-dim)', 
        border: '1px solid var(--amber)', 
        borderRadius: 8, 
        marginBottom: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10
      }}>
        <AlertCircle style={{ width: 16, height: 16, color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 11, color: 'var(--text)' }}>
          <strong>Note:</strong> Changes are runtime-only and will reset on container restart. 
          To persist changes, update the <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>.env</code> file.
        </div>
      </div>

      {/* Feature Flags by Category */}
      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <h3 style={{ 
            fontSize: 11, 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.12em', 
            color: 'var(--text3)', 
            marginBottom: 12 
          }}>
            {category}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categoryFlags.map(({ name, enabled }) => (
              <div
                key={name}
                style={{
                  padding: 16,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {formatFlagName(name)}
                    </span>
                    {enabled ? (
                      <CheckCircle style={{ width: 14, height: 14, color: 'var(--green)' }} />
                    ) : (
                      <div style={{ 
                        width: 14, 
                        height: 14, 
                        borderRadius: '50%', 
                        border: '2px solid var(--text3)' 
                      }} />
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>
                    {getFlagDescription(name)}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(name)}
                  disabled={saving}
                  style={{
                    position: 'relative',
                    width: 48,
                    height: 26,
                    borderRadius: 13,
                    border: 'none',
                    background: enabled ? 'var(--accent)' : 'var(--surface2)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: enabled ? 25 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Refresh Button */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={fetchFlags}
          disabled={loading || saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 500,
            cursor: loading || saving ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default FeatureFlagsManager;
