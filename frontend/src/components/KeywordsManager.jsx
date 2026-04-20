import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Plus, Trash2, RefreshCw, RotateCcw, Tag, CheckCircle2 } from 'lucide-react';

const DEFAULT_KEYWORDS = [
  // Foundation Models
  { keyword: 'transformer', category: 'Foundation Models' },
  { keyword: 'attention mechanism', category: 'Foundation Models' },
  { keyword: 'large language model', category: 'Foundation Models' },
  { keyword: 'llm', category: 'Foundation Models' },
  { keyword: 'foundation model', category: 'Foundation Models' },
  { keyword: 'pre-training', category: 'Foundation Models' },
  { keyword: 'fine-tuning', category: 'Foundation Models' },
  { keyword: 'RLHF', category: 'Foundation Models' },
  { keyword: 'instruction tuning', category: 'Foundation Models' },
  { keyword: 'constitutional AI', category: 'Foundation Models' },
  // Generative AI
  { keyword: 'generative AI', category: 'Generative AI' },
  { keyword: 'diffusion model', category: 'Generative AI' },
  { keyword: 'stable diffusion', category: 'Generative AI' },
  { keyword: 'text-to-image', category: 'Generative AI' },
  { keyword: 'text-to-video', category: 'Generative AI' },
  { keyword: 'multimodal', category: 'Generative AI' },
  { keyword: 'GPT', category: 'Generative AI' },
  { keyword: 'Claude', category: 'Generative AI' },
  { keyword: 'Gemini', category: 'Generative AI' },
  { keyword: 'Llama', category: 'Generative AI' },
  { keyword: 'Mistral', category: 'Generative AI' },
  { keyword: 'image generation', category: 'Generative AI' },
  { keyword: 'video generation', category: 'Generative AI' },
  // Agents & Reasoning
  { keyword: 'AI agent', category: 'Agents & Reasoning' },
  { keyword: 'autonomous agent', category: 'Agents & Reasoning' },
  { keyword: 'multi-agent', category: 'Agents & Reasoning' },
  { keyword: 'chain-of-thought', category: 'Agents & Reasoning' },
  { keyword: 'reasoning', category: 'Agents & Reasoning' },
  { keyword: 'planning', category: 'Agents & Reasoning' },
  { keyword: 'tool use', category: 'Agents & Reasoning' },
  { keyword: 'function calling', category: 'Agents & Reasoning' },
  { keyword: 'RAG', category: 'Agents & Reasoning' },
  { keyword: 'retrieval-augmented generation', category: 'Agents & Reasoning' },
  { keyword: 'agentic', category: 'Agents & Reasoning' },
  // Safety & Alignment
  { keyword: 'AI safety', category: 'Safety & Alignment' },
  { keyword: 'alignment', category: 'Safety & Alignment' },
  { keyword: 'hallucination', category: 'Safety & Alignment' },
  { keyword: 'bias', category: 'Safety & Alignment' },
  { keyword: 'fairness', category: 'Safety & Alignment' },
  { keyword: 'interpretability', category: 'Safety & Alignment' },
  { keyword: 'explainability', category: 'Safety & Alignment' },
  { keyword: 'red teaming', category: 'Safety & Alignment' },
  { keyword: 'jailbreak', category: 'Safety & Alignment' },
  { keyword: 'adversarial', category: 'Safety & Alignment' },
  // Infrastructure & Efficiency
  { keyword: 'quantization', category: 'Infrastructure & Efficiency' },
  { keyword: 'pruning', category: 'Infrastructure & Efficiency' },
  { keyword: 'distillation', category: 'Infrastructure & Efficiency' },
  { keyword: 'LoRA', category: 'Infrastructure & Efficiency' },
  { keyword: 'PEFT', category: 'Infrastructure & Efficiency' },
  { keyword: 'inference optimization', category: 'Infrastructure & Efficiency' },
  { keyword: 'GPU', category: 'Infrastructure & Efficiency' },
  { keyword: 'TPU', category: 'Infrastructure & Efficiency' },
  { keyword: 'edge AI', category: 'Infrastructure & Efficiency' },
  { keyword: 'on-device', category: 'Infrastructure & Efficiency' },
  { keyword: 'open-source model', category: 'Infrastructure & Efficiency' },
  { keyword: 'open weights', category: 'Infrastructure & Efficiency' },
  // Applications
  { keyword: 'code generation', category: 'Applications' },
  { keyword: 'copilot', category: 'Applications' },
  { keyword: 'AI coding', category: 'Applications' },
  { keyword: 'robotics', category: 'Applications' },
  { keyword: 'autonomous driving', category: 'Applications' },
  { keyword: 'drug discovery', category: 'Applications' },
  { keyword: 'protein folding', category: 'Applications' },
  { keyword: 'scientific AI', category: 'Applications' },
  { keyword: 'AI research', category: 'Applications' },
  // Industry & Business
  { keyword: 'OpenAI', category: 'Industry & Business' },
  { keyword: 'Anthropic', category: 'Industry & Business' },
  { keyword: 'Google DeepMind', category: 'Industry & Business' },
  { keyword: 'Meta AI', category: 'Industry & Business' },
  { keyword: 'Mistral AI', category: 'Industry & Business' },
  { keyword: 'Hugging Face', category: 'Industry & Business' },
  { keyword: 'AI startup', category: 'Industry & Business' },
  { keyword: 'AI regulation', category: 'Industry & Business' },
  { keyword: 'EU AI Act', category: 'Industry & Business' },
  { keyword: 'AGI', category: 'Industry & Business' },
  { keyword: 'superintelligence', category: 'Industry & Business' },
  // Benchmarks & Evaluation
  { keyword: 'benchmark', category: 'Benchmarks & Evaluation' },
  { keyword: 'MMLU', category: 'Benchmarks & Evaluation' },
  { keyword: 'HumanEval', category: 'Benchmarks & Evaluation' },
  { keyword: 'state-of-the-art', category: 'Benchmarks & Evaluation' },
  { keyword: 'SOTA', category: 'Benchmarks & Evaluation' },
  { keyword: 'leaderboard', category: 'Benchmarks & Evaluation' },
  { keyword: 'evaluation', category: 'Benchmarks & Evaluation' },
  { keyword: 'evals', category: 'Benchmarks & Evaluation' },
  { keyword: 'capability', category: 'Benchmarks & Evaluation' },
  { keyword: 'emergent', category: 'Benchmarks & Evaluation' },
];

const CATEGORIES = [
  'Foundation Models',
  'Generative AI',
  'Agents & Reasoning',
  'Safety & Alignment',
  'Infrastructure & Efficiency',
  'Applications',
  'Industry & Business',
  'Benchmarks & Evaluation',
];

function KeywordsManager() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/keywords');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setKeywords(data);
    } catch (err) {
      setError('Could not load keywords.');
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;

    setAdding(true);
    setAddError(null);
    setSuccess(null);
    try {
      const response = await apiFetch('/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: trimmed, category: newCategory.trim() || null }),
      });

      if (response.status === 409) {
        setAddError('Keyword already exists');
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setNewKeyword('');
      setNewCategory('');
      setSuccess('Keyword added successfully');
      setTimeout(() => setSuccess(null), 3000);
      await fetchKeywords();
    } catch (err) {
      setAddError('Failed to add keyword.');
    } finally {
      setAdding(false);
    }
  };

  const deleteKeyword = async (id) => {
    if (!window.confirm('Delete this keyword?')) return;

    try {
      const response = await apiFetch(`keywords/${id}`, { method: 'DELETE' });
      if (response.status === 404 || response.ok) {
        await fetchKeywords();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to delete keyword:', err);
      await fetchKeywords();
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm('Reset to default keywords? Existing keywords will be kept and defaults will be added.')) return;

    setResetting(true);
    try {
      const response = await apiFetch('/keywords/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: DEFAULT_KEYWORDS.map(k => k.keyword) }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fetchKeywords();
    } catch (err) {
      console.error('Failed to reset keywords:', err);
    } finally {
      setResetting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addKeyword();
  };

  // Group keywords by category
  const grouped = keywords.reduce((acc, kw) => {
    const cat = kw.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(kw);
    return acc;
  }, {});

  const sortedCategories = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
        <RefreshCw className="animate-spin" style={{ width: 24, height: 24, color: 'var(--accent)' }} />
        <span style={{ marginLeft: 8, color: 'var(--text2)' }}>Loading keywords...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.2 }}>
            <Tag style={{ width: 24, height: 24, color: 'var(--accent)' }} />
            Keywords
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
            {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} · Keywords boost article relevance scores
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          disabled={resetting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--accent2)',
            background: 'var(--accent2)', color: '#fff', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', opacity: resetting ? 0.5 : 1,
          }}
        >
          <RotateCcw style={{ width: 14, height: 14 }} className={resetting ? 'animate-spin' : ''} />
          {resetting ? 'Resetting...' : 'Reset to Defaults'}
        </button>
      </div>

      {/* Success Toast */}
      {success && (
        <div style={{ 
          padding: 16, 
          background: 'var(--green-dim)', 
          border: '1px solid var(--green)', 
          color: 'var(--green)', 
          borderRadius: 10, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12 
        }}>
          <CheckCircle2 style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 13 }}>{success}</span>
        </div>
      )}

      {/* Add Keyword Form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Add Keyword</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => { setNewKeyword(e.target.value); setAddError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. transformer"
            style={{
              flex: 1, minWidth: 200,
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--text)', fontSize: 12,
            }}
          />
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            list="category-suggestions"
            style={{
              width: 200, padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--text)', fontSize: 12,
            }}
          />
          <datalist id="category-suggestions">
            {CATEGORIES.map(cat => <option key={cat} value={cat} />)}
          </datalist>
          <button
            onClick={addKeyword}
            disabled={adding || !newKeyword.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent)',
              background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', opacity: (adding || !newKeyword.trim()) ? 0.5 : 1,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            {adding ? 'Adding...' : 'Add Keyword'}
          </button>
        </div>
        {addError && (
          <p style={{ marginTop: 8, fontSize: 11, color: 'var(--red)' }}>{addError}</p>
        )}
      </div>

      {/* Keywords List */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>All Keywords ({keywords.length})</h3>
        </div>

        {error ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>
            <button
              onClick={fetchKeywords}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent)',
                background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', margin: '0 auto',
              }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
              Retry
            </button>
          </div>
        ) : keywords.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)' }}>
            <p>No keywords yet.</p>
            <p style={{ fontSize: 11, marginTop: 8, color: 'var(--text3)' }}>Add keywords above or click "Reset to Defaults" to load the default list.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortedCategories.map((category) => (
              <div key={category} style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text3)', marginBottom: 12 }}>{category}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {grouped[category].map((kw) => (
                    <span key={kw.id} className="keyword-chip">
                      {kw.keyword}
                      <span
                        className="remove"
                        onClick={() => deleteKeyword(kw.id)}
                        title="Delete keyword"
                        aria-label={`Delete keyword ${kw.keyword}`}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default KeywordsManager;
