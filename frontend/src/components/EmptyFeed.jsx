import React from 'react';
import { Zap, Rss, ArrowRight } from 'lucide-react';

/**
 * EmptyFeed — shown when no stories exist at all (fresh install / pipeline never run).
 * Distinct from the "no filter matches" state which shows a "Clear filters" prompt.
 */
const EmptyFeed = ({ onRunPipeline, activeTheme }) => (
  <div className={`py-24 text-center rounded-3xl border-2 border-dashed transition-colors duration-500 ${
    activeTheme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
  }`}>
    <div className="flex items-center justify-center mb-6">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
        <Rss className="w-8 h-8 text-indigo-400" />
      </div>
    </div>

    <h2 className={`text-2xl font-black tracking-tight mb-2 ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
      No stories yet
    </h2>
    <p className={`text-sm mb-8 max-w-sm mx-auto ${activeTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
      Run the pipeline to fetch and analyze AI/ML articles from arXiv, GitHub, RSS feeds, and more.
    </p>

    <button
      onClick={onRunPipeline}
      className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all transform active:scale-95"
    >
      <Zap className="w-4 h-4" />
      Run Pipeline
      <ArrowRight className="w-4 h-4" />
    </button>

    <p className={`mt-6 text-xs ${activeTheme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
      First time? Make sure your{' '}
      <code className="font-mono bg-slate-100 text-slate-600 px-1 py-0.5 rounded">.env</code>
      {' '}is configured with an LLM provider key.
    </p>
  </div>
);

export default EmptyFeed;
